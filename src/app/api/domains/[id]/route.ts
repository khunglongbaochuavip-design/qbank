import { requireMinRole, requireRole, success } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMinRole(request, 'admin');
    if (user instanceof NextResponse) return user;
    const { id } = await params;
    const body = await request.json();
    const item = await prisma.domain.update({ where: { id }, data: body });
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

    await prisma.topic.deleteMany({ where: { domainId: id } });
    await prisma.question.updateMany({ where: { domainId: id }, data: { domainId: null } });
    await prisma.examBlueprintItem.deleteMany({ where: { domainId: id } });
    await prisma.domain.delete({ where: { id } });

    return success({ message: 'Đã xóa hoàn toàn lĩnh vực.' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
