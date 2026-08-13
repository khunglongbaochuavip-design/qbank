import { requireMinRole, success, logAction, getClientIP, badRequest, notFound } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMinRole(request, 'exam_officer');
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    const existing = await prisma.examSession.findUnique({ where: { id } });
    if (!existing) return notFound('Không tìm thấy phiên thi.');
    if (existing.status !== 'scheduled') {
      return badRequest(`Phiên thi không thể bắt đầu (trạng thái hiện tại: ${existing.status}).`);
    }

    const session = await prisma.examSession.update({
      where: { id }, data: { status: 'active' },
    });

    await logAction({ userId: user.id, action: 'START_SESSION', module: 'SESSION', targetId: id, ipAddress: getClientIP(request) });
    return success(session);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
