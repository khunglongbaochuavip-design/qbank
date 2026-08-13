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

    await prisma.question.update({ where: { id }, data: { status: 'rejected', reviewerId: user.id } });
    await prisma.questionReviewLog.create({
      data: { questionId: id, changedById: user.id, oldStatus: 'pending_review', newStatus: 'rejected', comment: body.comment || 'Không đạt yêu cầu' },
    });

    await logAction({ userId: user.id, action: 'REJECT', module: 'QUESTION', targetId: id, ipAddress: getClientIP(request) });
    return success({ message: 'Câu hỏi đã bị từ chối.' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
