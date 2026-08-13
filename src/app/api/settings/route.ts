import { requireAuth, success } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (key) {
      const setting = await prisma.systemSetting.findUnique({ where: { key } });
      return success(setting);
    }

    const settings = await prisma.systemSetting.findMany();
    return success(settings);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    if (!['super_admin', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    for (const [key, value] of Object.entries(settings)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    return success({ message: 'Đã lưu cài đặt.' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
