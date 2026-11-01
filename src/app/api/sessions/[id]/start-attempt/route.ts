import { requireAuth, success, badRequest, notFound, forbidden, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    if (user.role !== 'student') return forbidden('Chỉ dành cho học sinh.');

    const { id: sessionId } = await params;

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            examQuestions: {
              include: { question: true },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!session) return notFound('Không tìm thấy phiên thi.');
    if (session.status !== 'active') return badRequest('Phiên thi chưa bắt đầu hoặc đã kết thúc.');

    // Check assignment — covers both manually added and self-joined via access code
    const assigned = await prisma.examParticipant.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: user.id } },
    });
    if (!assigned) return forbidden('Bạn không được phân công vào phiên thi này. Hãy dùng mã tham gia trên trang "Bài thi của tôi".');

    // Helper to return existing attempt snapshot
    const buildAttemptResponse = async (attempt: {
      id: string;
      startedAt: Date;
      status: string;
      questions: { id: string; questionId: string; displayOrder: number; snapshotContent: string; optionMap: string }[];
      answers: { questionId: string; selectedOption: string | null; isCorrect: boolean }[];
    }, isReconnect: boolean) => {
      if (attempt.status !== 'in_progress') {
        return badRequest('Bạn đã nộp bài thi này.');
      }

      const durationSeconds = (session.durationMinutes || 60) * 60;
      const elapsedSeconds = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
      const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);

      // Auto-submit if time expired
      if (remainingSeconds <= 0) {
        const totalQuestions = attempt.questions.length;
        const correct = attempt.answers.filter(a => a.isCorrect).length;
        const wrong = totalQuestions - correct;
        const score = totalQuestions > 0 ? parseFloat(((correct / totalQuestions) * 10).toFixed(2)) : 0;
        await prisma.examAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'expired', submittedAt: new Date(), expiredAt: new Date(),
            numCorrect: correct, numWrong: wrong, score,
          },
        });
        return badRequest('Đã hết thời gian làm bài.');
      }

      const questions = attempt.questions.map(aq => {
        const snapshot = JSON.parse(aq.snapshotContent);
        const optionMap = JSON.parse(aq.optionMap);
        const answer = attempt.answers.find(a => a.questionId === aq.questionId);
        return {
          id: aq.questionId,
          attemptQuestionId: aq.id,
          displayOrder: aq.displayOrder,
          questionText: snapshot.questionText,
          contextText: snapshot.contextText,
          questionImage: snapshot.questionImage,
          optionA: snapshot[`option${optionMap.A}`],
          optionB: snapshot[`option${optionMap.B}`],
          optionC: snapshot[`option${optionMap.C}`],
          optionD: snapshot[`option${optionMap.D}`],
          selectedOption: answer?.selectedOption || null,
        };
      });

      await logAction({
        userId: user.id,
        action: isReconnect ? 'RECONNECT_EXAM' : 'START_EXAM',
        module: 'ATTEMPT',
        targetId: attempt.id,
        ipAddress: getClientIP(request),
      });

      return success({
        attempt: { id: attempt.id, startedAt: attempt.startedAt, authoritativeRemainingSeconds: remainingSeconds },
        session: { id: session.id, name: session.name, durationMinutes: session.durationMinutes },
        questions,
      });
    };

    // Check existing attempt
    const existingAttempt = await prisma.examAttempt.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: user.id } },
      include: {
        questions: { orderBy: { displayOrder: 'asc' } },
        answers: true,
      },
    });

    if (existingAttempt && existingAttempt.questions.length > 0) {
      return buildAttemptResponse(existingAttempt, true);
    }

    // ─── CREATE NEW ATTEMPT WITH SNAPSHOT IN ATOMIC TRANSACTION ───────────────────────────
    const seed = crypto.createHash('sha256').update(`${user.id}-${session.examId}-${Date.now()}`).digest('hex');
    const examQuestions = [...session.exam.examQuestions];
    const seededRandom = seedRandom(seed);
    shuffleArray(examQuestions, seededRandom);

    const preparedQuestions = examQuestions.map((eq, i) => {
      const q = eq.question;
      const optionKeys = ['A', 'B', 'C', 'D'];
      const shuffledKeys = [...optionKeys];
      shuffleArray(shuffledKeys, seededRandom);

      const optionMap: Record<string, string> = {};
      for (let j = 0; j < 4; j++) {
        optionMap[optionKeys[j]] = shuffledKeys[j];
      }

      const snapshot = {
        questionText: q.questionText,
        contextText: q.contextText,
        questionImage: q.questionImage,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        explanation: q.explanation,
      };

      return {
        questionId: q.id,
        displayOrder: i + 1,
        snapshotContent: JSON.stringify(snapshot),
        optionMap: JSON.stringify(optionMap),
      };
    });

    try {
      const createdAttempt = await prisma.$transaction(async (tx) => {
        // If an incomplete attempt with 0 questions existed from a prior failed run, populate it
        const att = existingAttempt
          ? existingAttempt
          : await tx.examAttempt.create({
              data: { sessionId, studentId: user.id, status: 'in_progress', seed },
            });

        if (preparedQuestions.length > 0) {
          await tx.examAttemptQuestion.createMany({
            data: preparedQuestions.map(pq => ({ ...pq, attemptId: att.id })),
            skipDuplicates: true,
          });
        }

        return tx.examAttempt.findUniqueOrThrow({
          where: { id: att.id },
          include: {
            questions: { orderBy: { displayOrder: 'asc' } },
            answers: true,
          },
        });
      });

      return buildAttemptResponse(createdAttempt, false);
    } catch (txErr) {
      // Handle race condition: double-click or two tabs opening simultaneously
      const racedAttempt = await prisma.examAttempt.findUnique({
        where: { sessionId_studentId: { sessionId, studentId: user.id } },
        include: {
          questions: { orderBy: { displayOrder: 'asc' } },
          answers: true,
        },
      });
      if (racedAttempt && racedAttempt.questions.length > 0) {
        return buildAttemptResponse(racedAttempt, true);
      }
      throw txErr;
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

// Seeded PRNG (simple LCG)
function seedRandom(seed: string): () => number {
  let s = 0;
  for (let i = 0; i < seed.length; i++) {
    s = ((s << 5) - s + seed.charCodeAt(i)) | 0;
  }
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
