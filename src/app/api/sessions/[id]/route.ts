import { requireAuth, requireMinRole, success, notFound, badRequest, forbidden, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const sessionInclude = {
  exam: { select: { id: true, name: true, code: true, maxAttempts: true, showResults: true } },
  createdBy: { select: { id: true, fullName: true } },
  participants: { include: { student: { select: { id: true, fullName: true, email: true } } } },
  attempts: { include: { student: { select: { id: true, fullName: true, email: true } } } },
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    const session = await prisma.examSession.findUnique({ where: { id }, include: sessionInclude });
    if (!session) return notFound('Không tìm thấy phiên thi.');

    if (user.role === 'student') {
      const assigned = session.participants.some(p => p.studentId === user.id);
      if (!assigned) return forbidden('Bạn không được phân công vào phiên thi này.');
    }

    return success(session);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMinRole(request, 'exam_officer');
    if (user instanceof NextResponse) return user;
    const { id } = await params;
    const { name, startTime, endTime, durationMinutes, status, studentIds } = await request.json();

    if (studentIds !== undefined) {
      await prisma.examParticipant.deleteMany({ where: { sessionId: id } });
      if (studentIds.length > 0) {
        await prisma.examParticipant.createMany({
          data: studentIds.map((sid: string) => ({ sessionId: id, studentId: sid })),
          skipDuplicates: true,
        });
      }
    }

    const session = await prisma.examSession.update({
      where: { id },
      data: {
        name, status: status as 'scheduled' | 'active' | 'ended' | undefined,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      },
      include: sessionInclude,
    });

    return success(session);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMinRole(request, 'exam_officer');
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    await prisma.examParticipant.deleteMany({ where: { sessionId: id } });
    await prisma.examAnswer.deleteMany({ where: { attempt: { sessionId: id } } });
    await prisma.examAttemptQuestion.deleteMany({ where: { attempt: { sessionId: id } } });
    await prisma.examAttempt.deleteMany({ where: { sessionId: id } });
    await prisma.examSession.delete({ where: { id } });

    await logAction({ userId: user.id, action: 'DELETE', module: 'SESSION', targetId: id, ipAddress: getClientIP(request) });
    return success({ message: 'Đã xóa phiên thi.' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
