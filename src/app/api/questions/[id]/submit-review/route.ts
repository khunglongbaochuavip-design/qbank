import { requireAuth, success, badRequest, forbidden, notFound, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    const q = await prisma.question.findUnique({ where: { id } });
    if (!q) return notFound('Không tìm thấy câu hỏi.');
    if (user.role === 'teacher' && q.createdById !== user.id) return forbidden('Không có quyền.');
    if (!['draft', 'rejected'].includes(q.status)) return badRequest('Chỉ có thể gửi câu hỏi ở trạng thái nháp hoặc bị từ chối.');

    await prisma.question.update({ where: { id }, data: { status: 'pending_review' } });
    await prisma.questionReviewLog.create({
      data: { questionId: id, changedById: user.id, oldStatus: q.status, newStatus: 'pending_review', comment: 'Gửi phê duyệt' },
    });
    await logAction({ userId: user.id, action: 'SUBMIT_REVIEW', module: 'QUESTION', targetId: id, ipAddress: getClientIP(request) });
    return success({ message: 'Đã gửi câu hỏi để phê duyệt.' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
