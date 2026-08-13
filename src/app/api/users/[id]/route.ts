import { requireMinRole, requireRole, success, badRequest, logAction, getClientIP } from '@/lib/api-utils';
import { hashPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(request, 'super_admin', 'admin');
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();
    const { fullName, role, isActive, password, subjectIds } = body;

    const updateData: Record<string, unknown> = {};
    if (fullName) updateData.fullName = fullName;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.passwordHash = await hashPassword(password);

    // Only update teacher subjects if subjectIds is explicitly provided in the request body
    if (Array.isArray(subjectIds)) {
      const targetRole = role || (await prisma.user.findUnique({ where: { id }, select: { role: true } }))?.role;
      await prisma.teacherSubject.deleteMany({ where: { userId: id } });
      if (subjectIds.length > 0 && targetRole === 'teacher') {
        await prisma.teacherSubject.createMany({
          data: subjectIds.map((sid: string) => ({ userId: id, subjectId: sid })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.user.update>[0]['data'],
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true, assignedSubjects: { include: { subject: true } } },
    });

    await logAction({ userId: user.id, action: 'UPDATE', module: 'USER', targetId: id, ipAddress: getClientIP(request) });
    return success(updated);
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
    if (id === user.id) return badRequest('Không thể xóa tài khoản đang đăng nhập.');

    try {
      await prisma.teacherSubject.deleteMany({ where: { userId: id } });
      await prisma.examParticipant.deleteMany({ where: { studentId: id } });
      await prisma.auditLog.deleteMany({ where: { userId: id } });
      await prisma.user.delete({ where: { id } });
      await logAction({ userId: user.id, action: 'DELETE', module: 'USER', targetId: id, ipAddress: getClientIP(request) });
      return success({ message: 'Đã xóa tài khoản thành công.' });
    } catch {
      await prisma.user.update({ where: { id }, data: { isActive: false } });
      await logAction({ userId: user.id, action: 'DEACTIVATE', module: 'USER', targetId: id, ipAddress: getClientIP(request) });
      return success({ message: 'Tài khoản có dữ liệu tạo câu hỏi/bài thi nên đã được khóa.' });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
