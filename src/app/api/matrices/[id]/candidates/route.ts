import { requireMinRole, success, notFound, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/matrices/[id]/candidates
 * Trả về danh sách câu hỏi approved phù hợp với từng ô của ma trận.
 * Dùng để người dùng tích chọn câu trước khi tạo đề thi.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMinRole(request, 'exam_officer');
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    const matrix = await prisma.examMatrix.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            domain: true,
            topic: true,
            cognitiveLevel: true,
            difficultyLevel: true,
          },
        },
      },
    });
    if (!matrix) return notFound('Không tìm thấy ma trận.');

    // For each matrix item, find all approved matching questions
    const groups = await Promise.all(matrix.items.map(async (item) => {
      const where: Record<string, unknown> = { status: 'approved' };
      if (item.domainId) where.domainId = item.domainId;
      if (item.topicId) where.topicId = item.topicId;
      if (item.cognitiveLevelId) where.cognitiveLevelId = item.cognitiveLevelId;
      if (item.difficultyLevel) {
        where.estimatedDifficulty = {
          gte: item.difficultyLevel.minVal,
          lte: item.difficultyLevel.maxVal,
        };
      }

      const questions = await prisma.question.findMany({
        where,
        select: {
          id: true,
          questionCode: true,
          questionText: true,
          correctOption: true,
          estimatedDifficulty: true,
          subject: { select: { name: true } },
          domain: { select: { name: true } },
          topic: { select: { name: true } },
          cognitiveLevel: { select: { name: true } },
          difficultyLevel: { select: { name: true, code: true } },
        },
        orderBy: { estimatedDifficulty: 'asc' },
      });

      return {
        item: {
          id: item.id,
          requiredCount: item.requiredCount,
          domain: item.domain,
          topic: item.topic,
          cognitiveLevel: item.cognitiveLevel,
          difficultyLevel: item.difficultyLevel,
        },
        questions,
        available: questions.length,
      };
    }));

    return success({ matrix, groups });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
