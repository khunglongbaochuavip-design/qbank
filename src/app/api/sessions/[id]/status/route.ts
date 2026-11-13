import { requireAuth, success, notFound, forbidden, logAction, getClientIP } from '@/lib/api-utils';
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
      select: { status: true, awayCount: true, awayTotalSeconds: true },
    });

    return success({
      sessionStatus: session.status,
      attemptStatus: attempt?.status ?? null,
      awayCount: attempt?.awayCount ?? 0,
      awayTotalSeconds: attempt?.awayTotalSeconds ?? 0,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

/**
 * POST /api/sessions/[id]/status
 * Records when a student leaves/returns to the exam screen (tab switch / app switch).
 * Uses Math.max so the counter is monotonically non-decreasing (can never be reset by the client).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    if (user.role !== 'student') return forbidden('Chỉ dành cho học sinh.');
    const { id: sessionId } = await params;

    const body = await request.json().catch(() => ({}));
    const rawCount = Math.max(0, Math.floor(Number(body.awayCount) || 0));
    const rawTotal = Math.max(0, Math.floor(Number(body.awayTotalSeconds) || 0));
    const lastAwaySeconds = Math.max(0, Math.floor(Number(body.lastAwaySeconds) || 0));

    const attempt = await prisma.examAttempt.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: user.id } },
      select: { id: true, status: true, awayCount: true, awayTotalSeconds: true },
    });
    if (!attempt || attempt.status !== 'in_progress') {
      return success({ saved: false });
    }

    const nextCount = Math.max(attempt.awayCount || 0, rawCount);
    const nextTotal = Math.max(attempt.awayTotalSeconds || 0, rawTotal);

    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: { awayCount: nextCount, awayTotalSeconds: nextTotal },
    });

    await logAction({
      userId: user.id,
      action: 'AWAY_SCREEN',
      module: 'ATTEMPT',
      targetId: attempt.id,
      details: { awayCount: nextCount, awayTotalSeconds: nextTotal, lastAwaySeconds },
      ipAddress: getClientIP(request),
    });

    return success({ saved: true, awayCount: nextCount, awayTotalSeconds: nextTotal });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
