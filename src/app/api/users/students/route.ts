import { requireAuth, success } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    const students = await prisma.user.findMany({
      where: { role: 'student', isActive: true },
      select: { id: true, email: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });
    return success(students);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
