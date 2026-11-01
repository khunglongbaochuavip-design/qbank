import { requireAuth, success, badRequest, notFound, forbidden, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { saveAnswerRecord, gradeAttempt } from '@/lib/exam-answer';

// Extra seconds after the timer reaches 0 during which final answers sent with the submit are still accepted
const SUBMIT_GRACE_SECONDS = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    if (user.role !== 'student') return forbidden('Chỉ dành cho học sinh.');

    const { id: sessionId } = await params;
    const body = await request.json().catch(() => ({}));

    const attempt = await prisma.examAttempt.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: user.id } },
      include: { session: { select: { durationMinutes: true } } },
    });

    if (!attempt) return notFound('Bài thi không tồn tại.');
    if (['submitted', 'auto_submitted', 'expired'].includes(attempt.status)) {
      return badRequest('Bài thi đã được nộp.');
    }

    // Final sync: the browser sends ALL its current answers with the submit, so an answer
    // whose individual save was still in flight (or failed) is not lost. Newer-click-wins still applies.
    const durationSeconds = (attempt.session.durationMinutes || 60) * 60;
    const elapsedSeconds = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
    const withinTime = elapsedSeconds <= durationSeconds + SUBMIT_GRACE_SECONDS;

    if (withinTime && Array.isArray(body.answers)) {
      for (const a of body.answers as { questionId?: string; selectedOption?: string | null; clientTs?: number }[]) {
        if (!a || typeof a.questionId !== 'string') continue;
        await saveAnswerRecord(
          attempt.id, a.questionId,
          a.selectedOption ?? null,
          typeof a.clientTs === 'number' ? a.clientTs : null,
        );
      }
    }

    // Grade the attempt (total = all questions of the attempt)
    const { numCorrect, numWrong, score } = await gradeAttempt(attempt.id);
    const submittedStatus = body.autoSubmit ? 'auto_submitted' : 'submitted';

    // Only transition if still in progress (guards against double submit / session end race)
    const res = await prisma.examAttempt.updateMany({
      where: { id: attempt.id, status: 'in_progress' },
      data: {
        status: submittedStatus as 'submitted' | 'auto_submitted',
        submittedAt: new Date(),
        numCorrect, numWrong, score,
      },
    });
    if (res.count === 0) return badRequest('Bài thi đã được nộp.');

    const updated = await prisma.examAttempt.findUnique({ where: { id: attempt.id } });

    await logAction({
      userId: user.id, action: submittedStatus === 'auto_submitted' ? 'AUTO_SUBMIT' : 'SUBMIT_EXAM',
      module: 'ATTEMPT', targetId: attempt.id,
      details: { score, numCorrect },
      ipAddress: getClientIP(request),
    });

    return success(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
