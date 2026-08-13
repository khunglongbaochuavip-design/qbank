import { requireAuth, requireMinRole, success, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    const url = new URL(request.url);
    const subjectId = url.searchParams.get('subjectId');
    const where: Record<string, unknown> = {};
    if (subjectId) where.subjectId = subjectId;

    const domains = await prisma.domain.findMany({ where, include: { subject: true }, orderBy: { sortOrder: 'asc' } });
    return success(domains);
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
    if (!body.code || !body.name || !body.subjectId) return badRequest('Thiếu thông tin bắt buộc.');
    const domain = await prisma.domain.create({ data: body });
    return success(domain, 201);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
