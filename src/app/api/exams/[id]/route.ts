import { requireMinRole, success, notFound, badRequest, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const examInclude = {
  matrix: { include: { items: true } },
  createdBy: { select: { id: true, fullName: true } },
  examQuestions: {
    include: { question: { include: { subject: true, domain: true, topic: true, cognitiveLevel: true, createdBy: { select: { fullName: true } } } } },
    orderBy: { displayOrder: 'asc' as const },
  },
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMinRole(request, 'teacher');
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    const exam = await prisma.exam.findUnique({ where: { id }, include: examInclude });
    if (!exam) return notFound('Không tìm thấy đề thi.');
    return success(exam);
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
    const body = await request.json();

    const existing = await prisma.exam.findUnique({ where: { id } });
    if (!existing) return notFound('Không tìm thấy đề thi.');
    if (existing.status === 'finalized') return badRequest('Không thể sửa đề thi đã chốt.');

    const { name, maxAttempts, showResults } = body;
    const exam = await prisma.exam.update({
      where: { id },
      data: { name: name || existing.name, maxAttempts: maxAttempts ?? existing.maxAttempts, showResults: showResults ?? existing.showResults },
      include: examInclude,
    });

    await logAction({ userId: user.id, action: 'UPDATE', module: 'EXAM', targetId: id, ipAddress: getClientIP(request) });
    return success(exam);
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

    const activeSessions = await prisma.examSession.findMany({ where: { examId: id, status: 'active' } });
    if (activeSessions.length > 0) return badRequest('Không thể xóa đề thi khi đang có phiên thi diễn ra.');

    const sessions = await prisma.examSession.findMany({ where: { examId: id }, select: { id: true } });
    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length > 0) {
      await prisma.examParticipant.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.examAnswer.deleteMany({ where: { attempt: { sessionId: { in: sessionIds } } } });
      await prisma.examAttemptQuestion.deleteMany({ where: { attempt: { sessionId: { in: sessionIds } } } });
      await prisma.examAttempt.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.examSession.deleteMany({ where: { examId: id } });
    }

    await prisma.examQuestion.deleteMany({ where: { examId: id } });
    await prisma.exam.delete({ where: { id } });
    await logAction({ userId: user.id, action: 'DELETE', module: 'EXAM', targetId: id, ipAddress: getClientIP(request) });
    return success({ message: 'Đã xóa hoàn toàn đề thi.' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
