import { requireMinRole, requireRole, success, badRequest, forbidden, notFound, logAction, getClientIP } from '@/lib/api-utils';
import { hashPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(request, 'super_admin', 'admin');
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return notFound('Không tìm thấy tài khoản.');

    if (user.role !== 'super_admin' && target.role === 'super_admin') {
      return forbidden('Chỉ Quản trị hệ thống mới có quyền chỉnh sửa tài khoản Super Admin.');
    }

    const body = await request.json();
    const { fullName, role, isActive, password, subjectIds, studentCode, className } = body;

    if (role && ['super_admin', 'admin'].includes(role) && user.role !== 'super_admin' && role !== target.role) {
      return forbidden('Chỉ Quản trị hệ thống mới có thể gán vai trò Quản trị.');
    }

    const updateData: Record<string, unknown> = {};
    if (fullName) updateData.fullName = fullName;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.passwordHash = await hashPassword(password);
    if (studentCode !== undefined) {
      const cleanCode = String(studentCode || '').trim() || null;
      if (cleanCode && cleanCode !== target.studentCode) {
        const dup = await prisma.user.findUnique({ where: { studentCode: cleanCode } });
        if (dup && dup.id !== id) return badRequest(`Mã học sinh "${cleanCode}" đã được sử dụng.`);
      }
      updateData.studentCode = cleanCode;
    }
    if (className !== undefined) {
      updateData.className = String(className || '').trim() || null;
    }

    // Only update teacher subjects if subjectIds is explicitly provided in the request body
    if (Array.isArray(subjectIds)) {
      const targetRole = role || target.role;
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
      select: {
        id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true,
        studentCode: true, className: true, assignedSubjects: { include: { subject: true } },
      },
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

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) return notFound('Không tìm thấy tài khoản.');
    if (target.role === 'super_admin' && user.role !== 'super_admin') {
      return forbidden('Chỉ Quản trị hệ thống mới có thể xóa tài khoản Super Admin.');
    }

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
