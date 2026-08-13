import { requireMinRole, success, notFound, badRequest, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMinRole(request, 'exam_officer');
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    const existing = await prisma.exam.findUnique({ where: { id }, include: { examQuestions: true } });
    if (!existing) return notFound('Không tìm thấy đề thi.');
    if (existing.examQuestions.length === 0) return badRequest('Đề thi phải có ít nhất 1 câu hỏi.');

    // Increment usage count
    const qIds = existing.examQuestions.map(eq => eq.questionId);
    await prisma.question.updateMany({ where: { id: { in: qIds } }, data: { usageCount: { increment: 1 } } });

    const exam = await prisma.exam.update({
      where: { id },
      data: { status: 'finalized', finalizedAt: new Date() },
    });

    await logAction({ userId: user.id, action: 'FINALIZE', module: 'EXAM', targetId: id, ipAddress: getClientIP(request) });
    return success(exam);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
