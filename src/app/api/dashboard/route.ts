import { requireAuth, success } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (user.role === 'student') {
      const [myAttempts, mySessions] = await Promise.all([
        prisma.examAttempt.count({ where: { studentId: user.id } }),
        prisma.examParticipant.count({ where: { studentId: user.id } }),
      ]);
      const avgScore = await prisma.examAttempt.aggregate({
        where: { studentId: user.id, score: { not: null } },
        _avg: { score: true },
      });
      return success({
        role: user.role,
        myAttempts,
        mySessions,
        avgScore: avgScore._avg.score ? parseFloat(avgScore._avg.score.toFixed(2)) : null,
      });
    }

    const [totalUsers, totalQuestions, totalExams, totalSessions, totalAttempts, questionsByStatus, recentAttempts] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.question.count(),
      prisma.exam.count(),
      prisma.examSession.count(),
      prisma.examAttempt.count(),
      prisma.question.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.examAttempt.findMany({
        where: { status: { in: ['submitted', 'auto_submitted'] } },
        include: { student: { select: { fullName: true } }, session: { include: { exam: { select: { name: true } } } } },
        orderBy: { submittedAt: 'desc' }, take: 10,
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    questionsByStatus.forEach(g => { statusCounts[g.status] = g._count.id; });

    return success({
      role: user.role,
      stats: { totalUsers, totalQuestions, totalExams, totalSessions, totalAttempts },
      questionsByStatus: statusCounts,
      recentAttempts: recentAttempts.map(a => ({
        id: a.id, studentName: a.student.fullName, examName: a.session.exam.name,
        score: a.score, submittedAt: a.submittedAt,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
