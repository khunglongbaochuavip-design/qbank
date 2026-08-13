import { requireMinRole, success, badRequest, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const examInclude = {
  matrix: { include: { items: true } },
  createdBy: { select: { id: true, fullName: true } },
  examQuestions: {
    include: { question: { include: { subject: true, domain: true, topic: true, cognitiveLevel: true } } },
    orderBy: { displayOrder: 'asc' as const },
  },
  _count: { select: { sessions: true } },
};

export async function GET(request: Request) {
  try {
    const user = await requireMinRole(request, 'teacher');
    if (user instanceof NextResponse) return user;

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (user.role === 'teacher') where.createdById = user.id;

    const exams = await prisma.exam.findMany({
      where,
      include: {
        matrix: true,
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { examQuestions: true, sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return success(exams);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

// Generate exam from matrix
export async function POST(request: Request) {
  try {
    const user = await requireMinRole(request, 'exam_officer');
    if (user instanceof NextResponse) return user;

    const { name, matrixId, numberOfVariants = 1 } = await request.json();
    if (!name || !matrixId) return badRequest('Tên đề thi và ma trận là bắt buộc.');

    const matrix = await prisma.examMatrix.findUnique({
      where: { id: matrixId },
      include: { items: { include: { difficultyLevel: true } } },
    });
    if (!matrix) return badRequest('Không tìm thấy ma trận.');

    // Select questions from matrix items
    const selectedQuestions: { id: string; [key: string]: unknown }[] = [];
    const warnings: string[] = [];

    for (const item of matrix.items) {
      const where: Record<string, unknown> = { status: 'approved' };
      if (item.domainId) where.domainId = item.domainId;
      if (item.topicId) where.topicId = item.topicId;
      if (item.cognitiveLevelId) where.cognitiveLevelId = item.cognitiveLevelId;
      if (item.difficultyLevel) {
        where.estimatedDifficulty = { gte: item.difficultyLevel.minVal, lte: item.difficultyLevel.maxVal };
      }
      if (selectedQuestions.length > 0) {
        where.id = { notIn: selectedQuestions.map(q => q.id) };
      }

      const available = await prisma.question.findMany({ where });

      if (available.length < item.requiredCount) {
        warnings.push(`Không đủ câu hỏi: cần ${item.requiredCount} nhưng chỉ có ${available.length}`);
        available.forEach(q => selectedQuestions.push(q));
      } else {
        // Stratified random selection
        const sorted = [...available].sort((a, b) => a.estimatedDifficulty - b.estimatedDifficulty);
        for (let i = 0; i < item.requiredCount; i++) {
          const startIdx = Math.floor((i * sorted.length) / item.requiredCount);
          const endIdx = Math.floor(((i + 1) * sorted.length) / item.requiredCount);
          const bucket = sorted.slice(startIdx, endIdx);
          if (bucket.length > 0) {
            selectedQuestions.push(bucket[Math.floor(Math.random() * bucket.length)]);
          }
        }
      }
    }

    const count = await prisma.exam.count();
    const createdExams = [];

    for (let variant = 1; variant <= Math.min(numberOfVariants, 10); variant++) {
      let examCode = `DE-${String(count + variant).padStart(4, '0')}-${Date.now().toString().slice(-6)}`;
      if (numberOfVariants > 1) examCode += `-V${variant}`;

      const variantQuestions = [...selectedQuestions].sort(() => Math.random() - 0.5);

      const exam = await prisma.exam.create({
        data: {
          name: numberOfVariants > 1 ? `${name} (Mã ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ"[(variant - 1) % 26]})` : name,
          code: examCode.substring(0, 50),
          matrixId, status: 'draft', createdById: user.id,
          examQuestions: {
            create: variantQuestions.map((q, idx) => {
              const opts = ['A', 'B', 'C', 'D'].sort(() => Math.random() - 0.5);
              return {
                questionId: q.id, displayOrder: idx + 1,
                optionMap: JSON.stringify({ A: opts[0], B: opts[1], C: opts[2], D: opts[3] }),
              };
            }),
          },
        },
        include: examInclude,
      });

      createdExams.push(exam);
    }

    await logAction({ userId: user.id, action: 'GENERATE_EXAM', module: 'EXAM', targetId: createdExams[0]?.id, details: { matrixId, variants: numberOfVariants }, ipAddress: getClientIP(request) });
    return success(numberOfVariants > 1 ? createdExams : createdExams[0], 201);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
