// src/routes/dashboard.routes.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalQuestions,
      approvedQuestions,
      pendingQuestions,
      draftQuestions,
      rejectedQuestions,
      totalExams,
      finalizedExams,
      totalSessions,
      totalAttempts,
      completedAttempts,
    ] = await Promise.all([
      prisma.question.count(),
      prisma.question.count({ where: { status: 'approved' } }),
      prisma.question.count({ where: { status: 'pending_review' } }),
      prisma.question.count({ where: { status: 'draft' } }),
      prisma.question.count({ where: { status: 'rejected' } }),
      prisma.exam.count(),
      prisma.exam.count({ where: { status: 'finalized' } }),
      prisma.examSession.count(),
      prisma.studentAttempt.count(),
      prisma.studentAttempt.count({ where: { status: 'submitted' } }),
    ]);

    // Questions by subject
    const subjects = await prisma.subject.findMany({ where: { isActive: true } });
    const questionsBySubject = await Promise.all(
      subjects.map(async (s) => ({
        subject: s.name,
        total: await prisma.question.count({ where: { subjectId: s.id } }),
        approved: await prisma.question.count({ where: { subjectId: s.id, status: 'approved' } }),
      }))
    );

    // Recent activity: last 5 pending questions  
    const recentPending = await prisma.question.findMany({
      where: { status: 'pending_review' },
      include: { createdBy: { select: { fullName: true } }, subject: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    // Recent sessions
    const recentSessions = await prisma.examSession.findMany({
      include: { exam: { select: { name: true } }, _count: { select: { attempts: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      questions: { total: totalQuestions, approved: approvedQuestions, pending: pendingQuestions, draft: draftQuestions, rejected: rejectedQuestions },
      exams: { total: totalExams, finalized: finalizedExams },
      sessions: { total: totalSessions },
      attempts: { total: totalAttempts, completed: completedAttempts },
      questionsBySubject,
      recentPending,
      recentSessions,
    });
  } catch (err) { next(err); }
});

module.exports = router;
