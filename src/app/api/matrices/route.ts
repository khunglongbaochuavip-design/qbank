import { requireMinRole, requireAuth, success, badRequest, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const matrixInclude = {
  subject: true,
  createdBy: { select: { id: true, fullName: true } },
  items: { include: { domain: true, topic: true, cognitiveLevel: true, difficultyLevel: true } },
};

export async function GET(request: Request) {
  try {
    const user = await requireMinRole(request, 'teacher');
    if (user instanceof NextResponse) return user;

    const url = new URL(request.url);
    const subjectId = url.searchParams.get('subjectId');
    const where: Record<string, unknown> = {};
    if (subjectId) where.subjectId = subjectId;
    if (user.role === 'teacher') where.createdById = user.id;

    const matrices = await prisma.examMatrix.findMany({ where, include: matrixInclude, orderBy: { createdAt: 'desc' } });
    return success(matrices);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireMinRole(request, 'teacher');
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { name, description, subjectId, items } = body;
    if (!name) return badRequest('Tên ma trận là bắt buộc.');

    const matrix = await prisma.examMatrix.create({
      data: {
        name, description, subjectId: subjectId || null, createdById: user.id,
        items: items?.length ? {
          create: items.map((c: Record<string, unknown>) => ({
            domainId: c.domainId || null, topicId: c.topicId || null,
            cognitiveLevelId: c.cognitiveLevelId || null, difficultyLevelId: c.difficultyLevelId || null,
            requiredCount: Number(c.requiredCount) || 1,
          })),
        } : undefined,
      },
      include: matrixInclude,
    });

    await logAction({ userId: user.id, action: 'CREATE', module: 'MATRIX', targetId: matrix.id, ipAddress: getClientIP(request) });
    return success(matrix, 201);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
