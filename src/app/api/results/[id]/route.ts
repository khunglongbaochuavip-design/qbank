import { requireAuth, success, notFound, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    const attempt = await prisma.examAttempt.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        session: { include: { exam: { select: { name: true, code: true, showResults: true } } } },
        questions: { orderBy: { displayOrder: 'asc' } },
        answers: true,
      },
    });

    if (!attempt) return notFound('Không tìm thấy bài thi.');

    // Students can only view own results
    if (user.role === 'student' && attempt.studentId !== user.id) return forbidden();

    // Build result with correct answer revealed if allowed
    const showDetails = user.role !== 'student' || attempt.session.exam.showResults;

    const questions = attempt.questions.map(aq => {
      const snapshot = JSON.parse(aq.snapshotContent);
      const optionMap = JSON.parse(aq.optionMap);
      const answer = attempt.answers.find(a => a.questionId === aq.questionId);

      const result: Record<string, unknown> = {
        id: aq.questionId,
        displayOrder: aq.displayOrder,
        questionText: snapshot.questionText,
        contextText: snapshot.contextText,
        optionA: snapshot[`option${optionMap.A}`],
        optionB: snapshot[`option${optionMap.B}`],
        optionC: snapshot[`option${optionMap.C}`],
        optionD: snapshot[`option${optionMap.D}`],
        selectedOption: answer?.selectedOption || null,
        isCorrect: answer?.isCorrect || false,
      };

      if (showDetails) {
        // Find which displayed option maps to the correct answer
        const correctOriginal = snapshot.correctOption;
        const correctDisplayed = Object.entries(optionMap).find(([, orig]) => orig === correctOriginal)?.[0];
        result.correctOption = correctDisplayed;
        result.explanation = snapshot.explanation;
      }

      return result;
    });

    return success({
      attempt: {
        id: attempt.id, score: attempt.score,
        numCorrect: attempt.numCorrect, numWrong: attempt.numWrong,
        startedAt: attempt.startedAt, submittedAt: attempt.submittedAt,
        status: attempt.status,
      },
      student: attempt.student,
      exam: attempt.session.exam,
      session: { id: attempt.session.id, name: attempt.session.name },
      questions,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
