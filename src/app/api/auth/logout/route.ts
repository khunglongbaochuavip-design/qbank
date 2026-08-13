import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Đã đăng xuất.' });
  response.cookies.set('qbank_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
