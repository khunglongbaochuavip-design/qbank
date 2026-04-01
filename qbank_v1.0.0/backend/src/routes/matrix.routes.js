// src/routes/matrix.routes.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeMinRole } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authenticate);
router.use(authorizeMinRole('exam_creator'));

const matrixInclude = {
  subject: true,
  createdBy: { select: { id: true, fullName: true } },
  cells: {
    include: {
      domain: true,
      topic: true,
      cognitiveLevel: true,
      difficultyLevel: true,
    },
  },
};

// GET /api/matrices
router.get('/', async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    const where = {};
    if (subjectId) where.subjectId = Number(subjectId);
    const matrices = await prisma.examMatrix.findMany({
      where,
      include: matrixInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(matrices);
  } catch (err) { next(err); }
});

// GET /api/matrices/:id
router.get('/:id', async (req, res, next) => {
  try {
    const matrix = await prisma.examMatrix.findUnique({
      where: { id: Number(req.params.id) },
      include: matrixInclude,
    });
    if (!matrix) return res.status(404).json({ error: 'Không tìm thấy ma trận.' });
    res.json(matrix);
  } catch (err) { next(err); }
});

// POST /api/matrices
router.post('/', async (req, res, next) => {
  try {
    const { name, description, subjectId, cells } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên ma trận là bắt buộc.' });

    const matrix = await prisma.examMatrix.create({
      data: {
        name, description,
        subjectId: subjectId ? Number(subjectId) : null,
        createdById: req.user.id,
        cells: cells?.length ? {
          create: cells.map(c => ({
            domainId: c.domainId ? Number(c.domainId) : null,
            topicId: c.topicId ? Number(c.topicId) : null,
            cognitiveLevelId: c.cognitiveLevelId ? Number(c.cognitiveLevelId) : null,
            difficultyLevelId: c.difficultyLevelId ? Number(c.difficultyLevelId) : null,
            requiredCount: Number(c.requiredCount) || 1,
          })),
        } : undefined,
      },
      include: matrixInclude,
    });
    res.status(201).json(matrix);
  } catch (err) { next(err); }
});

// PUT /api/matrices/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, description, subjectId, cells } = req.body;

    // Delete existing cells and recreate
    await prisma.matrixCell.deleteMany({ where: { matrixId: id } });

    const matrix = await prisma.examMatrix.update({
      where: { id },
      data: {
        name, description,
        subjectId: subjectId ? Number(subjectId) : null,
        cells: cells?.length ? {
          create: cells.map(c => ({
            domainId: c.domainId ? Number(c.domainId) : null,
            topicId: c.topicId ? Number(c.topicId) : null,
            cognitiveLevelId: c.cognitiveLevelId ? Number(c.cognitiveLevelId) : null,
            difficultyLevelId: c.difficultyLevelId ? Number(c.difficultyLevelId) : null,
            requiredCount: Number(c.requiredCount) || 1,
          })),
        } : undefined,
      },
      include: matrixInclude,
    });
    res.json(matrix);
  } catch (err) { next(err); }
});

// DELETE /api/matrices/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.examMatrix.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Đã xóa ma trận.' });
  } catch (err) { next(err); }
});

// POST /api/matrices/:id/check-availability
// Returns available question counts for each cell
router.post('/:id/check-availability', async (req, res, next) => {
  try {
    const matrix = await prisma.examMatrix.findUnique({
      where: { id: Number(req.params.id) },
      include: { cells: { include: { domain: true, topic: true, cognitiveLevel: true, difficultyLevel: true } } },
    });
    if (!matrix) return res.status(404).json({ error: 'Không tìm thấy ma trận.' });

    const cellAvailability = await Promise.all(matrix.cells.map(async (cell) => {
      const where = { status: 'approved' };
      if (cell.domainId) where.domainId = cell.domainId;
      if (cell.topicId) where.topicId = cell.topicId;
      if (cell.cognitiveLevelId) where.cognitiveLevelId = cell.cognitiveLevelId;
      if (cell.difficultyLevel) {
        where.estimatedDifficulty = { gte: cell.difficultyLevel.minVal, lte: cell.difficultyLevel.maxVal };
      }
      const available = await prisma.question.count({ where });
      return { ...cell, availableCount: available, sufficient: available >= cell.requiredCount };
    }));

    res.json(cellAvailability);
  } catch (err) { next(err); }
});

module.exports = router;
