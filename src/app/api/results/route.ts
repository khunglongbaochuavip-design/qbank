import { requireAuth, success, forbidden, notFound } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const myResults = url.searchParams.get('my');

    // Student: own results
    if (user.role === 'student' || myResults === 'true') {
      const attempts = await prisma.examAttempt.findMany({
        where: { studentId: user.id, status: { in: ['submitted', 'auto_submitted', 'expired'] } },
        include: {
          session: { include: { exam: { select: { name: true, code: true } } } },
        },
        orderBy: { submittedAt: 'desc' },
      });
      return success(attempts);
    }

    // Admin/exam_officer: session results
    if (!['super_admin', 'admin', 'exam_officer'].includes(user.role)) return forbidden();

    if (sessionId) {
      const attempts = await prisma.examAttempt.findMany({
        where: { sessionId },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
          session: { include: { exam: { select: { name: true, code: true, _count: { select: { examQuestions: true } } } } } },
          answers: true,
        },
        orderBy: { score: 'desc' },
      });
      return success(attempts);
    }

    // All sessions with stats
    const sessions = await prisma.examSession.findMany({
      include: {
        exam: { select: { name: true, code: true } },
        _count: { select: { attempts: true, participants: true } },
        attempts: { select: { score: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sessionStats = sessions.map(s => {
      const completed = s.attempts.filter(a => ['submitted', 'auto_submitted', 'expired'].includes(a.status));
      return {
        id: s.id, name: s.name, exam: s.exam, status: s.status,
        totalParticipants: s._count.participants,
        totalAttempts: s._count.attempts,
        submittedAttempts: completed.length,
        avgScore: completed.length > 0 ? parseFloat((completed.reduce((sum, a) => sum + (a.score || 0), 0) / completed.length).toFixed(2)) : null,
      };
    });

    return success(sessionStats);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
