// src/routes/exam.routes.js
const express = require('express');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeMinRole } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authenticate);

const examInclude = {
  matrix: { include: { cells: true } },
  createdBy: { select: { id: true, fullName: true } },
  examQuestions: {
    include: {
      question: {
        include: {
          subject: true, domain: true, topic: true,
          gradeLevel: true, cognitiveLevel: true,
          createdBy: { select: { fullName: true } },
        },
      },
    },
    orderBy: { displayOrder: 'asc' },
  },
};

// GET /api/exams
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const exams = await prisma.exam.findMany({
      where,
      include: {
        matrix: true,
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { examQuestions: true, sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(exams);
  } catch (err) { next(err); }
});

// GET /api/exams/:id
router.get('/:id', async (req, res, next) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: Number(req.params.id) },
      include: examInclude,
    });
    if (!exam) return res.status(404).json({ error: 'Không tìm thấy đề thi.' });
    res.json(exam);
  } catch (err) { next(err); }
});

// POST /api/exams/generate — Generate exam from matrix
router.post('/generate', authorizeMinRole('exam_creator'), async (req, res, next) => {
  try {
    const { name, matrixId } = req.body;
    if (!name || !matrixId) return res.status(400).json({ error: 'Tên đề thi và ma trận là bắt buộc.' });

    const matrix = await prisma.examMatrix.findUnique({
      where: { id: Number(matrixId) },
      include: { cells: { include: { difficultyLevel: true } } },
    });
    if (!matrix) return res.status(404).json({ error: 'Không tìm thấy ma trận.' });

    // Select questions for each cell
    const selectedQuestionIds = new Set();
    const errors = [];

    for (const cell of matrix.cells) {
      const where = { status: 'approved' };
      if (cell.domainId) where.domainId = cell.domainId;
      if (cell.topicId) where.topicId = cell.topicId;
      if (cell.cognitiveLevelId) where.cognitiveLevelId = cell.cognitiveLevelId;
      if (cell.difficultyLevel) {
        where.estimatedDifficulty = { gte: cell.difficultyLevel.minVal, lte: cell.difficultyLevel.maxVal };
      }
      // Exclude already selected
      where.id = { notIn: [...selectedQuestionIds].length ? [...selectedQuestionIds] : [-1] };

      const available = await prisma.question.findMany({ where, select: { id: true } });
      if (available.length < cell.requiredCount) {
        errors.push(`Không đủ câu hỏi cho ô: ${cell.requiredCount} yêu cầu nhưng chỉ có ${available.length}`);
        // Still add what we have
        available.forEach(q => selectedQuestionIds.add(q.id));
      } else {
        // Random shuffle and pick required count
        const shuffled = available.sort(() => Math.random() - 0.5);
        shuffled.slice(0, cell.requiredCount).forEach(q => selectedQuestionIds.add(q.id));
      }
    }

    // Generate unique exam code
    const count = await prisma.exam.count();
    const examCode = `DE-${String(count + 1).padStart(4, '0')}-${Date.now().toString().slice(-6)}`;

    const exam = await prisma.exam.create({
      data: {
        name,
        code: examCode.substring(0, 50),
        matrixId: Number(matrixId),
        status: 'draft',
        createdById: req.user.id,
        examQuestions: {
          create: [...selectedQuestionIds].map((qId, idx) => ({
            questionId: qId,
            displayOrder: idx + 1,
          })),
        },
      },
      include: examInclude,
    });

    if (errors.length) exam._warnings = errors;
    res.status(201).json(exam);
  } catch (err) { next(err); }
});

// PUT /api/exams/:id — Update exam (adjust questions)
router.put('/:id', authorizeMinRole('exam_creator'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, questionIds } = req.body;
    const existing = await prisma.exam.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy đề thi.' });
    if (existing.status === 'finalized') return res.status(400).json({ error: 'Không thể sửa đề thi đã chốt.' });

    if (questionIds) {
      await prisma.examQuestion.deleteMany({ where: { examId: id } });
      await prisma.examQuestion.createMany({
        data: questionIds.map((qId, idx) => ({ examId: id, questionId: Number(qId), displayOrder: idx + 1 })),
      });
    }

    const exam = await prisma.exam.update({
      where: { id },
      data: { name: name || existing.name },
      include: examInclude,
    });
    res.json(exam);
  } catch (err) { next(err); }
});

// POST /api/exams/:id/finalize — Finalize exam
router.post('/:id/finalize', authorizeMinRole('exam_creator'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.exam.findUnique({ where: { id }, include: { examQuestions: true } });
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy đề thi.' });
    if (existing.examQuestions.length === 0) return res.status(400).json({ error: 'Đề thi phải có ít nhất 1 câu hỏi.' });

    // Increment usage count for all questions
    const qIds = existing.examQuestions.map(eq => eq.questionId);
    await prisma.question.updateMany({ where: { id: { in: qIds } }, data: { usageCount: { increment: 1 } } });

    const exam = await prisma.exam.update({
      where: { id },
      data: { status: 'finalized', finalizedAt: new Date() },
      include: examInclude,
    });
    res.json(exam);
  } catch (err) { next(err); }
});

// GET /api/exams/:id/export — Export exam as Excel
router.get('/:id/export', authorizeMinRole('exam_creator'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        examQuestions: {
          include: { question: { include: { subject: true, domain: true, topic: true, cognitiveLevel: true } } },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    if (!exam) return res.status(404).json({ error: 'Không tìm thấy đề thi.' });

    const wb = new ExcelJS.Workbook();

    // Sheet 1: Question list
    const ws1 = wb.addWorksheet('Đề thi');
    ws1.addRow([`ĐỀ THI: ${exam.name}`]).font = { bold: true, size: 14 };
    ws1.addRow([`Mã đề: ${exam.code}`, `Ngày tạo: ${exam.createdAt.toLocaleDateString('vi-VN')}`, `Số câu: ${exam.examQuestions.length}`]);
    ws1.addRow([]);
    ws1.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Nội dung câu hỏi', key: 'text', width: 50 },
      { header: 'A', key: 'a', width: 25 },
      { header: 'B', key: 'b', width: 25 },
      { header: 'C', key: 'c', width: 25 },
      { header: 'D', key: 'd', width: 25 },
    ];

    exam.examQuestions.forEach((eq, idx) => {
      const q = eq.question;
      ws1.addRow({ stt: idx + 1, text: (q.contextText ? `[Dẫn ngữ: ${q.contextText}] ` : '') + q.questionText, a: q.optionA, b: q.optionB, c: q.optionC, d: q.optionD });
    });

    // Sheet 2: Answer key
    const ws2 = wb.addWorksheet('Đáp án');
    ws2.addRow([`ĐÁP ÁN: ${exam.name}`]).font = { bold: true };
    ws2.addRow(['STT', 'Mã câu hỏi', 'Đáp án', 'Môn học', 'Chủ đề', 'Mức nhận thức']).eachCell(c => { c.font = { bold: true }; });
    exam.examQuestions.forEach((eq, idx) => {
      const q = eq.question;
      ws2.addRow([idx + 1, q.questionCode, q.correctOption, q.subject?.name || '', q.topic?.name || '', q.cognitiveLevel?.name || '']);
    });

    res.setHeader('Content-Disposition', `attachment; filename=exam_${exam.code}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

// DELETE /api/exams/:id
router.delete('/:id', authorizeMinRole('exam_creator'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const exam = await prisma.exam.findUnique({ where: { id }, include: { sessions: true } });
    if (exam?.sessions?.length > 0) return res.status(400).json({ error: 'Không thể xóa đề thi đã có phiên thi.' });
    await prisma.exam.delete({ where: { id } });
    res.json({ message: 'Đã xóa đề thi.' });
  } catch (err) { next(err); }
});

module.exports = router;
