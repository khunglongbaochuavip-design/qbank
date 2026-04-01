// src/routes/result.routes.js
const express = require('express');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeMinRole } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authenticate);

// GET /api/results/sessions/:sessionId — Results for a session
router.get('/sessions/:sessionId', authorizeMinRole('exam_creator'), async (req, res, next) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: true },
    });
    if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên thi.' });

    const attempts = await prisma.studentAttempt.findMany({
      where: { sessionId },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        responses: {
          include: { question: { select: { id: true, questionCode: true, correctOption: true, estimatedDifficulty: true } } },
        },
      },
      orderBy: { score: 'desc' },
    });

    res.json({ session, attempts });
  } catch (err) { next(err); }
});

// GET /api/results/attempts/:attemptId — Detailed attempt (student or admin)
router.get('/attempts/:attemptId', async (req, res, next) => {
  try {
    const attempt = await prisma.studentAttempt.findUnique({
      where: { id: Number(req.params.attemptId) },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        session: { include: { exam: true } },
        responses: {
          include: {
            question: {
              select: {
                id: true, questionCode: true, questionText: true,
                optionA: true, optionB: true, optionC: true, optionD: true,
                correctOption: true, explanation: true, questionImage: true,
                subject: { select: { name: true } },
                topic: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!attempt) return res.status(404).json({ error: 'Không tìm thấy bài làm.' });

    // Students can only see their own - and only if submitted
    if (req.user.role === 'student') {
      if (attempt.studentId !== req.user.id) return res.status(403).json({ error: 'Không có quyền.' });
      if (attempt.status !== 'submitted') return res.status(400).json({ error: 'Bài thi chưa được nộp.' });
    }

    res.json(attempt);
  } catch (err) { next(err); }
});

// GET /api/results/my — Student's own results
router.get('/my', async (req, res, next) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Chỉ dành cho học sinh.' });
    const attempts = await prisma.studentAttempt.findMany({
      where: { studentId: req.user.id, status: 'submitted' },
      include: {
        session: { include: { exam: { select: { name: true, code: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    });
    res.json(attempts);
  } catch (err) { next(err); }
});

// GET /api/results/sessions/:sessionId/export — Full Excel export
router.get('/sessions/:sessionId/export', authorizeMinRole('academic_admin'), async (req, res, next) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: { include: { examQuestions: { include: { question: { include: { subject: true, domain: true, topic: true } } } } } } },
    });
    if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên thi.' });

    const attempts = await prisma.studentAttempt.findMany({
      where: { sessionId, status: 'submitted' },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        responses: { include: { question: true } },
      },
      orderBy: { score: 'desc' },
    });

    const wb = new ExcelJS.Workbook();

    // ─── Sheet 1: Exam Results Summary ────────────────────────────
    const ws1 = wb.addWorksheet('Tổng hợp kết quả');
    ws1.columns = [
      { header: 'Mã học sinh', key: 'studentId', width: 14 },
      { header: 'Họ và tên', key: 'fullName', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Mã đề thi', key: 'examCode', width: 16 },
      { header: 'Phiên thi', key: 'sessionName', width: 25 },
      { header: 'Bắt đầu', key: 'startedAt', width: 20 },
      { header: 'Nộp bài', key: 'submittedAt', width: 20 },
      { header: 'Điểm', key: 'score', width: 10 },
      { header: 'Số câu đúng', key: 'numCorrect', width: 14 },
      { header: 'Số câu sai', key: 'numWrong', width: 14 },
    ];
    ws1.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1890FF' } }; });

    for (const a of attempts) {
      ws1.addRow({
        studentId: a.studentId,
        fullName: a.student.fullName,
        email: a.student.email,
        examCode: session.exam.code,
        sessionName: session.name,
        startedAt: a.startedAt ? a.startedAt.toLocaleString('vi-VN') : '',
        submittedAt: a.submittedAt ? a.submittedAt.toLocaleString('vi-VN') : '',
        score: a.score || 0,
        numCorrect: a.numCorrect || 0,
        numWrong: a.numWrong || 0,
      });
    }

    // ─── Sheet 2: Item Responses ───────────────────────────────────
    const ws2 = wb.addWorksheet('Câu trả lời chi tiết');
    ws2.columns = [
      { header: 'Mã học sinh', key: 'studentId', width: 14 },
      { header: 'Tên học sinh', key: 'fullName', width: 25 },
      { header: 'Mã đề thi', key: 'examId', width: 14 },
      { header: 'Mã câu hỏi', key: 'questionCode', width: 20 },
      { header: 'Đáp án chọn', key: 'selected', width: 14 },
      { header: 'Đáp án đúng', key: 'correct', width: 14 },
      { header: 'Đúng/Sai', key: 'isCorrect', width: 12 },
    ];
    ws2.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF722ED1' } }; });

    for (const a of attempts) {
      for (const r of a.responses) {
        ws2.addRow({
          studentId: a.studentId,
          fullName: a.student.fullName,
          examId: session.examId,
          questionCode: r.question.questionCode,
          selected: r.selectedOption || '(Bỏ trống)',
          correct: r.question.correctOption,
          isCorrect: r.isCorrect ? 'Đúng' : 'Sai',
        });
      }
    }

    // ─── Sheet 3: Item Statistics ──────────────────────────────────
    const ws3 = wb.addWorksheet('Thống kê câu hỏi');
    ws3.columns = [
      { header: 'Mã câu hỏi', key: 'questionCode', width: 20 },
      { header: 'Môn học', key: 'subject', width: 15 },
      { header: 'Lĩnh vực', key: 'domain', width: 20 },
      { header: 'Chủ đề', key: 'topic', width: 20 },
      { header: 'Tổng số trả lời', key: 'totalResponses', width: 18 },
      { header: 'Số câu đúng', key: 'correctCount', width: 15 },
      { header: '% Đúng (p-value)', key: 'pValue', width: 18 },
      { header: 'Độ khó thực nghiệm', key: 'empDiff', width: 20 },
    ];
    ws3.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF52C41A' } }; });

    // Collect per-question stats
    const questionStats = {};
    for (const a of attempts) {
      for (const r of a.responses) {
        const qId = r.questionId;
        if (!questionStats[qId]) {
          questionStats[qId] = { question: r.question, total: 0, correct: 0 };
        }
        questionStats[qId].total++;
        if (r.isCorrect) questionStats[qId].correct++;
      }
    }

    const examQMap = {};
    session.exam.examQuestions.forEach(eq => { examQMap[eq.questionId] = eq.question; });

    for (const [qId, stats] of Object.entries(questionStats)) {
      const q = examQMap[qId] || stats.question;
      const pValue = stats.total > 0 ? parseFloat(((stats.correct / stats.total) * 100).toFixed(1)) : 0;
      ws3.addRow({
        questionCode: q.questionCode,
        subject: q.subject?.name || '',
        domain: q.domain?.name || '',
        topic: q.topic?.name || '',
        totalResponses: stats.total,
        correctCount: stats.correct,
        pValue: `${pValue}%`,
        empDiff: parseFloat((1 - pValue / 100).toFixed(3)),
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename=results_session_${sessionId}_${Date.now()}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

// PUT /api/results/questions/difficulty — Batch update difficulty
router.put('/questions/difficulty', authorizeMinRole('academic_admin'), async (req, res, next) => {
  try {
    const { updates } = req.body; // [{ questionId, empiricalDifficulty, finalDifficulty }]
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates phải là mảng.' });

    const results = [];
    for (const u of updates) {
      const data = {};
      if (u.empiricalDifficulty !== undefined) data.empiricalDifficulty = Number(u.empiricalDifficulty);
      if (u.finalDifficulty !== undefined) data.finalDifficulty = Number(u.finalDifficulty);
      const q = await prisma.question.update({ where: { id: Number(u.questionId) }, data });
      results.push({ id: q.id, empiricalDifficulty: q.empiricalDifficulty, finalDifficulty: q.finalDifficulty });
    }
    res.json({ updated: results.length, results });
  } catch (err) { next(err); }
});

module.exports = router;
