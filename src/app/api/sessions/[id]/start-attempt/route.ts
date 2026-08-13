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

    // Check assignment
    const assigned = await prisma.examParticipant.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: user.id } },
    });
    if (!assigned) return forbidden('Bạn không được phân công vào phiên thi này.');

    // Check existing attempt
    let attempt = await prisma.examAttempt.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: user.id } },
      include: {
        questions: { orderBy: { displayOrder: 'asc' } },
        answers: true,
      },
    });

    if (attempt && attempt.status !== 'in_progress') {
      return badRequest('Bạn đã nộp bài thi này.');
    }

    // If attempt exists, return saved snapshot
    if (attempt) {
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

      // Return existing snapshot (no correct answers)
      const questions = attempt.questions.map(aq => {
        const snapshot = JSON.parse(aq.snapshotContent);
        const optionMap = JSON.parse(aq.optionMap);
        const answer = attempt!.answers.find(a => a.questionId === aq.questionId);
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

      await logAction({ userId: user.id, action: 'RECONNECT_EXAM', module: 'ATTEMPT', targetId: attempt.id, ipAddress: getClientIP(request) });

      return success({
        attempt: { id: attempt.id, startedAt: attempt.startedAt, authoritativeRemainingSeconds: remainingSeconds },
        session: { id: session.id, name: session.name, durationMinutes: session.durationMinutes },
        questions,
      });
    }

    // ─── CREATE NEW ATTEMPT WITH SNAPSHOT ───────────────────────────

    const seed = crypto.createHash('sha256').update(`${user.id}-${session.examId}-${Date.now()}`).digest('hex');

    attempt = await prisma.examAttempt.create({
      data: { sessionId, studentId: user.id, status: 'in_progress', seed },
      include: { questions: true, answers: true },
    });

    // Shuffle questions deterministically using seed
    const examQuestions = [...session.exam.examQuestions];
    const seededRandom = seedRandom(seed);
    shuffleArray(examQuestions, seededRandom);

    // Create snapshot for each question — build all data first, then bulk insert
    const snapshotData: { attemptId: string; questionId: string; displayOrder: number; snapshotContent: string; optionMap: string }[] = [];
    const snapshotMeta: { idx: number; q: typeof examQuestions[0]['question']; optionMap: Record<string, string> }[] = [];

    for (let i = 0; i < examQuestions.length; i++) {
      const eq = examQuestions[i];
      const q = eq.question;

      // Shuffle options
      const optionKeys = ['A', 'B', 'C', 'D'];
      const shuffledKeys = [...optionKeys];
      shuffleArray(shuffledKeys, seededRandom);

      // optionMap: displayed position -> original position
      // e.g., { A: "C", B: "A", C: "D", D: "B" } means displayed A shows original C
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
      };

      snapshotData.push({
        attemptId: attempt.id,
        questionId: q.id,
        displayOrder: i + 1,
        snapshotContent: JSON.stringify(snapshot),
        optionMap: JSON.stringify(optionMap),
      });
      snapshotMeta.push({ idx: i, q, optionMap });
    }

    // Bulk insert all attempt questions in a single query (eliminates N+1)
    await prisma.examAttemptQuestion.createMany({ data: snapshotData });

    // Fetch back the created IDs in display order
    const createdAQs = await prisma.examAttemptQuestion.findMany({
      where: { attemptId: attempt.id },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, displayOrder: true, questionId: true },
    });
    const aqMap = new Map(createdAQs.map(aq => [aq.questionId, aq]));

    const snapshotQuestions = snapshotMeta.map(({ idx, q, optionMap }) => {
      const aq = aqMap.get(q.id)!;
      const snapshotContent = JSON.parse(snapshotData[idx].snapshotContent);
      return {
        id: q.id,
        attemptQuestionId: aq.id,
        displayOrder: idx + 1,
        questionText: q.questionText,
        contextText: q.contextText,
        questionImage: q.questionImage,
        optionA: snapshotContent[`option${optionMap.A}`],
        optionB: snapshotContent[`option${optionMap.B}`],
        optionC: snapshotContent[`option${optionMap.C}`],
        optionD: snapshotContent[`option${optionMap.D}`],
        selectedOption: null,
      };
    });

    const durationSeconds = (session.durationMinutes || 60) * 60;

    await logAction({ userId: user.id, action: 'START_EXAM', module: 'ATTEMPT', targetId: attempt.id, ipAddress: getClientIP(request) });

    return success({
      attempt: { id: attempt.id, startedAt: attempt.startedAt, authoritativeRemainingSeconds: durationSeconds },
      session: { id: session.id, name: session.name, durationMinutes: session.durationMinutes },
      questions: snapshotQuestions,
    });
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
