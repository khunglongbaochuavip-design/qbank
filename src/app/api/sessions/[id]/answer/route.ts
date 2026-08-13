import { requireAuth, success, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    if (user.role !== 'student') return forbidden('Chỉ dành cho học sinh.');

    const { id: sessionId } = await params;
    const { questionId, selectedOption } = await request.json();

    const attempt = await prisma.examAttempt.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: user.id } },
    });
    if (!attempt || attempt.status !== 'in_progress') return badRequest('Bài thi không hợp lệ hoặc đã nộp.');

    // Check time
    const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
    if (session) {
      const durationSeconds = (session.durationMinutes || 60) * 60;
      const elapsedSeconds = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
      if (elapsedSeconds > durationSeconds + 10) {
        return badRequest('Đã hết thời gian làm bài.');
      }
    }

    // Find the attempt question to get option mapping
    const aq = await prisma.examAttemptQuestion.findUnique({
      where: { attemptId_questionId: { attemptId: attempt.id, questionId } },
    });
    if (!aq) return badRequest('Câu hỏi không hợp lệ.');

    const optionMap = JSON.parse(aq.optionMap); // displayed -> original
    const snapshot = JSON.parse(aq.snapshotContent);

    // Map selected option back to original
    const originalOption = selectedOption ? optionMap[selectedOption] : null;
    const isCorrect = originalOption === snapshot.correctOption;

    await prisma.examAnswer.upsert({
      where: { attemptId_questionId: { attemptId: attempt.id, questionId } },
      update: { selectedOption, originalOption, isCorrect, answeredAt: new Date() },
      create: {
        attemptId: attempt.id, attemptQuestionId: aq.id, questionId,
        selectedOption, originalOption, isCorrect,
      },
    });

    await prisma.examAttempt.update({
      where: { id: attempt.id }, data: { lastSavedAt: new Date() },
    });

    return success({ saved: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
