import { requireAuth, success, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { saveAnswerRecord } from '@/lib/exam-answer';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    if (user.role !== 'student') return forbidden('Chỉ dành cho học sinh.');

    const { id: sessionId } = await params;
    const { questionId, selectedOption, clientTs } = await request.json();
    if (!questionId) return badRequest('Thiếu mã câu hỏi.');

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

    // Map displayed option -> original option, grade against snapshot, newer click wins
    const result = await saveAnswerRecord(
      attempt.id, questionId,
      selectedOption ?? null,
      typeof clientTs === 'number' ? clientTs : null,
    );
    if (!result.ok) return badRequest(result.error);

    await prisma.examAttempt.update({
      where: { id: attempt.id }, data: { lastSavedAt: new Date() },
    });

    return success({ saved: true, applied: result.applied });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
