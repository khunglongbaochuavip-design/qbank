import { requireMinRole, success, notFound, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const matrixInclude = {
  subject: true,
  createdBy: { select: { id: true, fullName: true } },
  items: { include: { domain: true, topic: true, cognitiveLevel: true, difficultyLevel: true } },
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMinRole(request, 'teacher');
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    const matrix = await prisma.examMatrix.findUnique({ where: { id }, include: matrixInclude });
    if (!matrix) return notFound('Không tìm thấy ma trận.');
    return success(matrix);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMinRole(request, 'teacher');
    if (user instanceof NextResponse) return user;
    const { id } = await params;
    const body = await request.json();
    const { name, description, subjectId, items } = body;

    await prisma.examBlueprintItem.deleteMany({ where: { matrixId: id } });

    const matrix = await prisma.examMatrix.update({
      where: { id },
      data: {
        name, description, subjectId: subjectId || null,
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

    await logAction({ userId: user.id, action: 'UPDATE', module: 'MATRIX', targetId: id, ipAddress: getClientIP(request) });
    return success(matrix);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMinRole(request, 'exam_officer');
    if (user instanceof NextResponse) return user;
    const { id } = await params;
    await prisma.exam.updateMany({ where: { matrixId: id }, data: { matrixId: null } });
    await prisma.examBlueprintItem.deleteMany({ where: { matrixId: id } });
    await prisma.examMatrix.delete({ where: { id } });
    await logAction({ userId: user.id, action: 'DELETE', module: 'MATRIX', targetId: id, ipAddress: getClientIP(request) });
    return success({ message: 'Đã xóa hoàn toàn ma trận.' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
