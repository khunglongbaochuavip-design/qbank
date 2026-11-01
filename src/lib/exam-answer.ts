import prisma from '@/lib/prisma';

export const VALID_OPTIONS = ['A', 'B', 'C', 'D'] as const;

export type SaveAnswerResult =
  | { ok: true; applied: boolean }
  | { ok: false; error: string };

/**
 * Save one student answer for an attempt.
 *
 * - selectedOption: letter the student SAW (displayed order), or null to clear.
 * - originalOption: mapped back to the ORIGINAL bank letter through optionMap.
 * - isCorrect: compared against the snapshot's correctOption (frozen at attempt start).
 * - clientTs: click timestamp from the browser. A save is only applied if it is newer than
 *   the stored one, so requests arriving out of order can never overwrite a later choice.
 */
export async function saveAnswerRecord(
  attemptId: string,
  questionId: string,
  selectedOption: string | null,
  clientTs: number | null,
): Promise<SaveAnswerResult> {
  if (selectedOption !== null && !(VALID_OPTIONS as readonly string[]).includes(selectedOption)) {
    return { ok: false, error: 'Phương án không hợp lệ.' };
  }

  const aq = await prisma.examAttemptQuestion.findUnique({
    where: { attemptId_questionId: { attemptId, questionId } },
  });
  if (!aq) return { ok: false, error: 'Câu hỏi không hợp lệ.' };

  const optionMap = JSON.parse(aq.optionMap) as Record<string, string>; // displayed -> original
  const snapshot = JSON.parse(aq.snapshotContent) as { correctOption: string };

  const originalOption = selectedOption ? optionMap[selectedOption] ?? null : null;
  const isCorrect = !!originalOption && originalOption === snapshot.correctOption;
  const ts = typeof clientTs === 'number' && Number.isFinite(clientTs) ? clientTs : Date.now();

  const data = { selectedOption, originalOption, isCorrect, answeredAt: new Date(), clientTs: ts };

  // Conditional update: only if no stored timestamp or stored one is older
  const updated = await prisma.examAnswer.updateMany({
    where: {
      attemptId, questionId,
      OR: [{ clientTs: null }, { clientTs: { lt: ts } }],
    },
    data,
  });
  if (updated.count > 0) return { ok: true, applied: true };

  const exists = await prisma.examAnswer.findUnique({
    where: { attemptId_questionId: { attemptId, questionId } },
    select: { id: true },
  });
  if (exists) return { ok: true, applied: false }; // a newer answer is already stored

  try {
    await prisma.examAnswer.create({
      data: { attemptId, attemptQuestionId: aq.id, questionId, ...data },
    });
    return { ok: true, applied: true };
  } catch {
    // Concurrent create won the race — retry the conditional update once
    const retry = await prisma.examAnswer.updateMany({
      where: { attemptId, questionId, OR: [{ clientTs: null }, { clientTs: { lt: ts } }] },
      data,
    });
    return { ok: true, applied: retry.count > 0 };
  }
}

/** Grade an attempt: total = ALL questions in the attempt (unanswered counts as wrong). */
export async function gradeAttempt(attemptId: string) {
  const [totalQuestions, correct] = await Promise.all([
    prisma.examAttemptQuestion.count({ where: { attemptId } }),
    prisma.examAnswer.count({ where: { attemptId, isCorrect: true } }),
  ]);
  const score = totalQuestions > 0 ? parseFloat(((correct / totalQuestions) * 10).toFixed(2)) : 0;
  return { totalQuestions, numCorrect: correct, numWrong: totalQuestions - correct, score };
}
