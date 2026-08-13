import { requireAuth, success, badRequest } from '@/lib/api-utils';
import { verifyPassword, hashPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return badRequest('Thiếu thông tin.');
    }
    if (newPassword.length < 6) {
      return badRequest('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }

    const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fullUser) return badRequest('Người dùng không tồn tại.');

    const isValid = await verifyPassword(currentPassword, fullUser.passwordHash);
    if (!isValid) {
      return badRequest('Mật khẩu hiện tại không đúng.');
    }

    const hash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    return success({ message: 'Đổi mật khẩu thành công.' });
  } catch {
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
