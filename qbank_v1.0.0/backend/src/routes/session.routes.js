// src/routes/session.routes.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeMinRole } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authenticate);

const sessionInclude = {
  exam: { select: { id: true, name: true, code: true, examQuestions: { select: { questionId: true } } } },
  createdBy: { select: { id: true, fullName: true } },
  sessionStudents: { include: { student: { select: { id: true, fullName: true, email: true } } } },
  _count: { select: { attempts: true } },
};

// GET /api/sessions — For admins/exam creators
router.get('/', authorizeMinRole('exam_creator'), async (req, res, next) => {
  try {
    const sessions = await prisma.examSession.findMany({
      include: sessionInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(sessions);
  } catch (err) { next(err); }
});

// GET /api/sessions/my — For students: their assigned sessions
router.get('/my', async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Chỉ dành cho học sinh.' });
    }
    const assigned = await prisma.sessionStudent.findMany({
      where: { studentId: req.user.id },
      include: {
        session: {
          include: {
            exam: { select: { id: true, name: true, code: true, _count: { select: { examQuestions: true } } } },
          },
        },
      },
    });

    // For each session, check if student has an attempt
    const results = await Promise.all(assigned.map(async (ss) => {
      const attempt = await prisma.studentAttempt.findUnique({
        where: { sessionId_studentId: { sessionId: ss.sessionId, studentId: req.user.id } },
      });
      return { ...ss.session, attempt };
    }));

    res.json(results);
  } catch (err) { next(err); }
});

// GET /api/sessions/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const session = await prisma.examSession.findUnique({
      where: { id },
      include: {
        ...sessionInclude,
        attempts: {
          include: { student: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });
    if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên thi.' });

    // Students can only see their own session if they're assigned
    if (req.user.role === 'student') {
      const assigned = session.sessionStudents.some(ss => ss.studentId === req.user.id);
      if (!assigned) return res.status(403).json({ error: 'Bạn không được phân công vào phiên thi này.' });
    }
    res.json(session);
  } catch (err) { next(err); }
});

// POST /api/sessions — Create session
router.post('/', authorizeMinRole('exam_creator'), async (req, res, next) => {
  try {
    const { examId, name, startTime, endTime, durationMinutes, studentIds } = req.body;
    if (!examId || !name) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc.' });

    const exam = await prisma.exam.findUnique({ where: { id: Number(examId) } });
    if (!exam) return res.status(404).json({ error: 'Không tìm thấy đề thi.' });
    if (exam.status !== 'finalized') return res.status(400).json({ error: 'Chỉ có thể tạo phiên thi từ đề thi đã chốt.' });

    const session = await prisma.examSession.create({
      data: {
        examId: Number(examId),
        name,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        durationMinutes: Number(durationMinutes) || 60,
        status: 'scheduled',
        createdById: req.user.id,
        sessionStudents: studentIds?.length ? {
          create: studentIds.map(sid => ({ studentId: Number(sid) })),
        } : undefined,
      },
      include: sessionInclude,
    });
    res.status(201).json(session);
  } catch (err) { next(err); }
});

// PUT /api/sessions/:id — Update session
router.put('/:id', authorizeMinRole('exam_creator'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, startTime, endTime, durationMinutes, status, studentIds } = req.body;

    if (studentIds !== undefined) {
      await prisma.sessionStudent.deleteMany({ where: { sessionId: id } });
      if (studentIds.length > 0) {
        await prisma.sessionStudent.createMany({
          data: studentIds.map(sid => ({ sessionId: id, studentId: Number(sid) })),
          skipDuplicates: true,
        });
      }
    }

    const session = await prisma.examSession.update({
      where: { id },
      data: {
        name, status,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      },
      include: sessionInclude,
    });
    res.json(session);
  } catch (err) { next(err); }
});

// POST /api/sessions/:id/start — Activate session 
router.post('/:id/start', authorizeMinRole('exam_creator'), async (req, res, next) => {
  try {
    const session = await prisma.examSession.update({
      where: { id: Number(req.params.id) },
      data: { status: 'active' },
    });
    res.json(session);
  } catch (err) { next(err); }
});

// POST /api/sessions/:id/end
router.post('/:id/end', authorizeMinRole('exam_creator'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    // Auto-submit any in-progress attempts
    const inProgressAttempts = await prisma.studentAttempt.findMany({
      where: { sessionId: id, status: 'in_progress' },
      include: { responses: true },
    });

    for (const attempt of inProgressAttempts) {
      const correct = attempt.responses.filter(r => r.isCorrect).length;
      const total = attempt.responses.length;
      await prisma.studentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'submitted', submittedAt: new Date(), numCorrect: correct, numWrong: total - correct, score: total > 0 ? (correct / total) * 10 : 0 },
      });
    }

    const session = await prisma.examSession.update({
      where: { id },
      data: { status: 'ended' },
    });
    res.json(session);
  } catch (err) { next(err); }
});

// ─── Student attempt routes ────────────────────────────────────────

// POST /api/sessions/:id/start-attempt — Student starts the exam
router.post('/:id/start-attempt', async (req, res, next) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Chỉ dành cho học sinh.' });
    const sessionId = Number(req.params.id);

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: { include: { examQuestions: { include: { question: true }, orderBy: { displayOrder: 'asc' } } } } },
    });
    if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên thi.' });
    if (session.status !== 'active') return res.status(400).json({ error: 'Phiên thi chưa bắt đầu hoặc đã kết thúc.' });

    // Check assignment
    const assigned = await prisma.sessionStudent.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: req.user.id } },
    });
    if (!assigned) return res.status(403).json({ error: 'Bạn không được phân công vào phiên thi này.' });

    // Check existing attempt
    let attempt = await prisma.studentAttempt.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: req.user.id } },
      include: { responses: true },
    });

    if (!attempt) {
      attempt = await prisma.studentAttempt.create({
        data: { sessionId, studentId: req.user.id, status: 'in_progress' },
        include: { responses: true },
      });
    }

    if (attempt.status === 'submitted') {
      return res.status(400).json({ error: 'Bạn đã nộp bài thi này.' });
    }

    // Return questions WITHOUT revealing correct answers
    const questions = session.exam.examQuestions.map(eq => ({
      id: eq.question.id,
      questionCode: eq.question.questionCode,
      displayOrder: eq.displayOrder,
      contextText: eq.question.contextText,
      questionText: eq.question.questionText,
      optionA: eq.question.optionA,
      optionB: eq.question.optionB,
      optionC: eq.question.optionC,
      optionD: eq.question.optionD,
      questionImage: eq.question.questionImage,
    }));

    res.json({
      attempt,
      session: { id: session.id, name: session.name, durationMinutes: session.durationMinutes, startTime: session.startTime, endTime: session.endTime },
      questions,
    });
  } catch (err) { next(err); }
});

// PUT /api/sessions/:id/answer — Save a single answer
router.put('/:id/answer', async (req, res, next) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Chỉ dành cho học sinh.' });
    const sessionId = Number(req.params.id);
    const { questionId, selectedOption } = req.body;

    const attempt = await prisma.studentAttempt.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: req.user.id } },
    });
    if (!attempt || attempt.status === 'submitted') return res.status(400).json({ error: 'Bài thi không hợp lệ hoặc đã nộp.' });

    const question = await prisma.question.findUnique({ where: { id: Number(questionId) } });
    if (!question) return res.status(404).json({ error: 'Câu hỏi không tồn tại.' });

    const isCorrect = selectedOption === question.correctOption;

    await prisma.studentResponse.upsert({
      where: { attemptId_questionId: { attemptId: attempt.id, questionId: Number(questionId) } },
      update: { selectedOption, isCorrect, answeredAt: new Date() },
      create: { attemptId: attempt.id, questionId: Number(questionId), selectedOption, isCorrect },
    });

    res.json({ saved: true, isCorrect: null }); // Don't reveal correctness during exam
  } catch (err) { next(err); }
});

// POST /api/sessions/:id/submit — Submit exam
router.post('/:id/submit', async (req, res, next) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Chỉ dành cho học sinh.' });
    const sessionId = Number(req.params.id);

    const attempt = await prisma.studentAttempt.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: req.user.id } },
      include: { responses: true },
    });
    if (!attempt) return res.status(404).json({ error: 'Bài thi không tồn tại.' });
    if (attempt.status === 'submitted') return res.status(400).json({ error: 'Bài thi đã được nộp.' });

    // Count correct answers
    const total = attempt.responses.length;
    const correct = attempt.responses.filter(r => r.isCorrect).length;
    const wrong = total - correct;
    const score = total > 0 ? parseFloat(((correct / total) * 10).toFixed(2)) : 0;

    const updated = await prisma.studentAttempt.update({
      where: { id: attempt.id },
      data: { status: 'submitted', submittedAt: new Date(), numCorrect: correct, numWrong: wrong, score },
      include: { responses: { include: { question: { select: { correctOption: true, questionCode: true } } } } },
    });

    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
