import { requireAuth, success, notFound, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/sessions/[id]/status
 * Lightweight polling endpoint for the exam screen: session status + the student's own attempt status.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    if (user.role !== 'student') return forbidden('Chỉ dành cho học sinh.');
    const { id: sessionId } = await params;

    const session = await prisma.examSession.findUnique({ where: { id: sessionId }, select: { status: true } });
    if (!session) return notFound('Không tìm thấy phiên thi.');

    const attempt = await prisma.examAttempt.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: user.id } },
      select: { status: true },
    });

    return success({ sessionStatus: session.status, attemptStatus: attempt?.status ?? null });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
