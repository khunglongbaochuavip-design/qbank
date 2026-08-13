import { requireAuth, requireMinRole, success, badRequest, notFound, forbidden, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const sessionInclude = {
  exam: { select: { id: true, name: true, code: true, maxAttempts: true, showResults: true, _count: { select: { examQuestions: true } } } },
  createdBy: { select: { id: true, fullName: true } },
  participants: { include: { student: { select: { id: true, fullName: true, email: true } } } },
  _count: { select: { attempts: true } },
};

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    const url = new URL(request.url);
    const myExams = url.searchParams.get('my');

    // Student: get their assigned sessions
    if (user.role === 'student' || myExams === 'true') {
      const assigned = await prisma.examParticipant.findMany({
        where: { studentId: user.id },
        include: {
          session: {
            include: {
              exam: { select: { id: true, name: true, code: true, _count: { select: { examQuestions: true } } } },
            },
          },
        },
      });

      const results = await Promise.all(assigned.map(async (ss) => {
        const attempt = await prisma.examAttempt.findUnique({
          where: { sessionId_studentId: { sessionId: ss.sessionId, studentId: user.id } },
        });
        return { ...ss.session, attempt };
      }));

      return success(results);
    }

    // Admin/teacher view
    const where: Record<string, unknown> = {};
    if (user.role === 'teacher') where.createdById = user.id;

    const sessions = await prisma.examSession.findMany({ where, include: sessionInclude, orderBy: { createdAt: 'desc' } });
    return success(sessions);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireMinRole(request, 'exam_officer');
    if (user instanceof NextResponse) return user;

    const { examId, name, startTime, endTime, durationMinutes, studentIds } = await request.json();
    if (!examId || !name) return badRequest('Thiếu thông tin bắt buộc.');

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return notFound('Không tìm thấy đề thi.');
    if (exam.status !== 'finalized') return badRequest('Chỉ có thể tạo phiên thi từ đề thi đã chốt.');

    const session = await prisma.examSession.create({
      data: {
        examId, name,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        durationMinutes: Number(durationMinutes) || 60,
        status: 'scheduled', createdById: user.id,
        participants: studentIds?.length ? {
          create: studentIds.map((sid: string) => ({ studentId: sid })),
        } : undefined,
      },
      include: sessionInclude,
    });

    await logAction({ userId: user.id, action: 'CREATE', module: 'SESSION', targetId: session.id, ipAddress: getClientIP(request) });
    return success(session, 201);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
