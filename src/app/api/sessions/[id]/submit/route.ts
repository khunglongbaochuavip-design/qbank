import { requireAuth, success, badRequest, notFound, forbidden, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    if (user.role !== 'student') return forbidden('Chỉ dành cho học sinh.');

    const { id: sessionId } = await params;
    const body = await request.json().catch(() => ({}));

    const attempt = await prisma.examAttempt.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: user.id } },
      include: { answers: true },
    });

    if (!attempt) return notFound('Bài thi không tồn tại.');
    if (['submitted', 'auto_submitted', 'expired'].includes(attempt.status)) {
      return badRequest('Bài thi đã được nộp.');
    }

    // Grade the attempt
    const totalQuestions = await prisma.examAttemptQuestion.count({ where: { attemptId: attempt.id } });
    const correct = attempt.answers.filter(a => a.isCorrect).length;
    const wrong = totalQuestions - correct;
    const score = totalQuestions > 0 ? parseFloat(((correct / totalQuestions) * 10).toFixed(2)) : 0;

    const submittedStatus = body.autoSubmit ? 'auto_submitted' : 'submitted';

    const updated = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: submittedStatus as 'submitted' | 'auto_submitted',
        submittedAt: new Date(),
        numCorrect: correct, numWrong: wrong, score,
      },
    });

    await logAction({
      userId: user.id, action: submittedStatus === 'auto_submitted' ? 'AUTO_SUBMIT' : 'SUBMIT_EXAM',
      module: 'ATTEMPT', targetId: attempt.id,
      details: { score, numCorrect: correct },
      ipAddress: getClientIP(request),
    });

    return success(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
