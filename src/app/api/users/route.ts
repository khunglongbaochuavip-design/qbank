import { requireRole, requireAuth, success, badRequest, notFound, forbidden, logAction, getClientIP } from '@/lib/api-utils';
import { hashPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await requireRole(request, 'super_admin', 'admin');
    if (user instanceof NextResponse) return user;

    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    const isActive = url.searchParams.get('isActive');
    const search = url.searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (isActive !== null && isActive !== undefined && isActive !== '') where.isActive = isActive === 'true';
    if (search) where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { studentCode: { contains: search, mode: 'insensitive' } },
    ];

    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true, studentCode: true, className: true, assignedSubjects: { include: { subject: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return success(users);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(request, 'super_admin', 'admin');
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { email, password, fullName, role, subjectIds, studentCode, className } = body;

    if (!email || !password || !fullName || !role) {
      return badRequest('Thiếu thông tin bắt buộc.');
    }
    const validRoles = ['super_admin', 'admin', 'teacher', 'exam_officer', 'student'];
    if (!validRoles.includes(role)) {
      return badRequest('Vai trò không hợp lệ.');
    }

    // Only super_admin can create super_admin/admin
    if (['super_admin', 'admin'].includes(role) && user.role !== 'super_admin') {
      return forbidden('Chỉ quản trị hệ thống mới có thể tạo vai trò này.');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return badRequest('Email đã được sử dụng.');

    const passwordHash = await hashPassword(password);
    const userData: Record<string, unknown> = {
      email, passwordHash, fullName, role,
      studentCode: studentCode || null,
      className: className || null,
    };

    if (role === 'teacher' && Array.isArray(subjectIds) && subjectIds.length > 0) {
      userData.assignedSubjects = {
        create: subjectIds.map((sid: string) => ({ subjectId: sid })),
      };
    }

    const newUser = await prisma.user.create({
      data: userData as Parameters<typeof prisma.user.create>[0]['data'],
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true, studentCode: true, className: true, assignedSubjects: { include: { subject: true } } },
    });

    await logAction({ userId: user.id, action: 'CREATE', module: 'USER', targetId: newUser.id, ipAddress: getClientIP(request) });
    return success(newUser, 201);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
