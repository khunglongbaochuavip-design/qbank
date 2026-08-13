import { requireMinRole, success, badRequest, notFound, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMinRole(request, 'exam_officer');
    if (user instanceof NextResponse) return user;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const q = await prisma.question.findUnique({ where: { id } });
    if (!q) return notFound('Không tìm thấy câu hỏi.');
    if (q.status !== 'pending_review') return badRequest('Câu hỏi không ở trạng thái chờ phê duyệt.');

    // Prevent self-approval for teachers
    if (q.createdById === user.id && user.role === 'teacher') {
      return badRequest('Không thể tự phê duyệt câu hỏi của mình.');
    }

    await prisma.question.update({ where: { id }, data: { status: 'approved', reviewerId: user.id, approvedAt: new Date() } });
    await prisma.questionReviewLog.create({
      data: { questionId: id, changedById: user.id, oldStatus: 'pending_review', newStatus: 'approved', comment: body.comment || 'Đã phê duyệt' },
    });

    // Handle revision superseding
    if (q.parentId) {
      const parent = await prisma.question.findUnique({ where: { id: q.parentId } });
      if (parent && parent.status === 'approved') {
        await prisma.question.update({ where: { id: parent.id }, data: { status: 'archived', supersededById: q.id } });
      }
    }

    await logAction({ userId: user.id, action: 'APPROVE', module: 'QUESTION', targetId: id, ipAddress: getClientIP(request) });
    return success({ message: 'Câu hỏi đã được phê duyệt.' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
