import { requireMinRole, success, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMinRole(request, 'exam_officer');
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    // Auto-submit in-progress attempts with correct grading
    const inProgressAttempts = await prisma.examAttempt.findMany({
      where: { sessionId: id, status: 'in_progress' },
      include: { answers: true },
    });

    for (const attempt of inProgressAttempts) {
      // CRITICAL: total = all questions in the attempt, NOT just answered ones
      const totalQuestions = await prisma.examAttemptQuestion.count({
        where: { attemptId: attempt.id },
      });
      const correct = attempt.answers.filter(a => a.isCorrect).length;
      const total = totalQuestions > 0 ? totalQuestions : attempt.answers.length;
      await prisma.examAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'auto_submitted', submittedAt: new Date(),
          numCorrect: correct, numWrong: total - correct,
          score: total > 0 ? parseFloat(((correct / total) * 10).toFixed(2)) : 0,
        },
      });
    }

    const session = await prisma.examSession.update({
      where: { id }, data: { status: 'ended' },
    });

    await logAction({ userId: user.id, action: 'END_SESSION', module: 'SESSION', targetId: id, ipAddress: getClientIP(request) });
    return success(session);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
