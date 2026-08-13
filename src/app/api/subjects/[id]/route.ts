import { requireMinRole, requireRole, success, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMinRole(request, 'admin');
    if (user instanceof NextResponse) return user;
    const { id } = await params;
    const body = await request.json();
    const item = await prisma.subject.update({ where: { id }, data: body });
    await logAction({ userId: user.id, action: 'UPDATE', module: 'SUBJECT', targetId: id, ipAddress: getClientIP(request) });
    return success(item);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMinRole(request, 'admin');
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    await prisma.teacherSubject.deleteMany({ where: { subjectId: id } });
    await prisma.question.updateMany({ where: { subjectId: id }, data: { subjectId: null } });
    await prisma.examMatrix.updateMany({ where: { subjectId: id }, data: { subjectId: null } });

    const domains = await prisma.domain.findMany({ where: { subjectId: id }, select: { id: true } });
    const domainIds = domains.map(d => d.id);
    if (domainIds.length > 0) {
      await prisma.topic.deleteMany({ where: { domainId: { in: domainIds } } });
      await prisma.domain.deleteMany({ where: { subjectId: id } });
    }

    await prisma.subject.delete({ where: { id } });
    await logAction({ userId: user.id, action: 'DELETE', module: 'SUBJECT', targetId: id, ipAddress: getClientIP(request) });
    return success({ message: 'Đã xóa hoàn toàn môn học.' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
