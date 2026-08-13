import { requireAuth, requireMinRole, success, badRequest, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    const where: Record<string, unknown> = {};
    if (user.role === 'teacher') {
      const assigned = await prisma.teacherSubject.findMany({ where: { userId: user.id } });
      where.id = { in: assigned.map(a => a.subjectId) };
    }

    const subjects = await prisma.subject.findMany({ where, orderBy: { sortOrder: 'asc' } });
    return success(subjects);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireMinRole(request, 'admin');
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    if (!body.code || !body.name) return badRequest('Mã và tên môn học là bắt buộc.');

    const subject = await prisma.subject.create({ data: body });
    await logAction({ userId: user.id, action: 'CREATE', module: 'SUBJECT', targetId: subject.id, ipAddress: getClientIP(request) });
    return success(subject, 201);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
