import { requireAuth, success, badRequest, notFound, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * POST /api/sessions/join
 * Body: { accessCode: string }
 * 
 * A student submits an access code to self-enroll in an exam session.
 * Creates an ExamParticipant row if the session allows self-join.
 * Returns the session so the student can redirect to /take-exam/[id].
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    if (user.role !== 'student') return forbidden('Chỉ học sinh mới có thể dùng mã tham gia.');

    const body = await request.json();
    const rawCode = String(body.accessCode || '').trim().toUpperCase();
    if (!rawCode) return badRequest('Vui lòng nhập mã tham gia.');

    // Lookup session by access code
    const session = await prisma.examSession.findUnique({
      where: { accessCode: rawCode },
      include: {
        exam: { select: { id: true, name: true, code: true, _count: { select: { examQuestions: true } } } },
        _count: { select: { participants: true } },
      },
    });

    if (!session) return notFound('Mã tham gia không hợp lệ hoặc phiên thi không tồn tại.');
    if (session.status === 'ended') return badRequest('Phiên thi đã kết thúc.');

    // If session does NOT allow self-join, only pre-assigned students may enter
    if (!session.allowSelfJoin) {
      const assigned = await prisma.examParticipant.findUnique({
        where: { sessionId_studentId: { sessionId: session.id, studentId: user.id } },
      });
      if (!assigned) return forbidden('Phiên thi này không cho phép tự tham gia. Liên hệ giáo viên để được thêm vào danh sách.');
      // Student is already in — just return session info
      return success({ session, alreadyJoined: true });
    }

    // Check if already a participant
    const existing = await prisma.examParticipant.findUnique({
      where: { sessionId_studentId: { sessionId: session.id, studentId: user.id } },
    });

    if (!existing) {
      await prisma.examParticipant.create({
        data: { sessionId: session.id, studentId: user.id },
      });
    }

    return success({ session, alreadyJoined: !!existing });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
