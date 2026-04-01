// src/routes/master.routes.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize, authorizeMinRole } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authenticate);

// ─── Generic CRUD factory ──────────────────────────────────────────
function crudRoutes(modelName, uniqueField = 'code') {
  const r = express.Router();
  r.get('/', async (req, res, next) => {
    try {
      const items = await prisma[modelName].findMany({ orderBy: { sortOrder: 'asc' } });
      res.json(items);
    } catch { 
      try {
        const items = await prisma[modelName].findMany({ orderBy: { id: 'asc' } });
        res.json(items);
      } catch (err) { next(err); }
    }
  });
  r.post('/', authorizeMinRole('academic_admin'), async (req, res, next) => {
    try {
      const item = await prisma[modelName].create({ data: req.body });
      res.status(201).json(item);
    } catch (err) { next(err); }
  });
  r.put('/:id', authorizeMinRole('academic_admin'), async (req, res, next) => {
    try {
      const item = await prisma[modelName].update({ where: { id: Number(req.params.id) }, data: req.body });
      res.json(item);
    } catch (err) { next(err); }
  });
  r.delete('/:id', authorize('super_admin'), async (req, res, next) => {
    try {
      await prisma[modelName].delete({ where: { id: Number(req.params.id) } });
      res.json({ message: 'Đã xóa.' });
    } catch (err) { next(err); }
  });
  return r;
}

// ─── Subjects ──────────────────────────────────────────────────────
router.use('/subjects', crudRoutes('subject'));

// ─── Domains (with subject filter) ────────────────────────────────
router.get('/domains', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.subjectId) where.subjectId = Number(req.query.subjectId);
    const items = await prisma.domain.findMany({ where, include: { subject: true }, orderBy: { sortOrder: 'asc' } });
    res.json(items);
  } catch (err) { next(err); }
});
router.post('/domains', authorizeMinRole('academic_admin'), async (req, res, next) => {
  try {
    const item = await prisma.domain.create({ data: req.body });
    res.status(201).json(item);
  } catch (err) { next(err); }
});
router.put('/domains/:id', authorizeMinRole('academic_admin'), async (req, res, next) => {
  try {
    const item = await prisma.domain.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json(item);
  } catch (err) { next(err); }
});
router.delete('/domains/:id', authorize('super_admin'), async (req, res, next) => {
  try {
    await prisma.domain.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Đã xóa.' });
  } catch (err) { next(err); }
});

// ─── Topics (with domain filter) ──────────────────────────────────
router.get('/topics', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.domainId) where.domainId = Number(req.query.domainId);
    if (req.query.subjectId) {
      const domains = await prisma.domain.findMany({ where: { subjectId: Number(req.query.subjectId) } });
      where.domainId = { in: domains.map(d => d.id) };
    }
    const items = await prisma.topic.findMany({ where, include: { domain: { include: { subject: true } } }, orderBy: { sortOrder: 'asc' } });
    res.json(items);
  } catch (err) { next(err); }
});
router.post('/topics', authorizeMinRole('academic_admin'), async (req, res, next) => {
  try {
    const item = await prisma.topic.create({ data: req.body });
    res.status(201).json(item);
  } catch (err) { next(err); }
});
router.put('/topics/:id', authorizeMinRole('academic_admin'), async (req, res, next) => {
  try {
    const item = await prisma.topic.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json(item);
  } catch (err) { next(err); }
});
router.delete('/topics/:id', authorize('super_admin'), async (req, res, next) => {
  try {
    await prisma.topic.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Đã xóa.' });
  } catch (err) { next(err); }
});

// ─── Grade Levels ──────────────────────────────────────────────────
router.use('/grade-levels', crudRoutes('gradeLevel'));

// ─── Cognitive Levels ──────────────────────────────────────────────
router.use('/cognitive-levels', crudRoutes('cognitiveLevel'));

// ─── Difficulty Levels ─────────────────────────────────────────────
router.use('/difficulty-levels', crudRoutes('difficultyLevel'));

// ─── Tags ──────────────────────────────────────────────────────────
router.get('/tags', async (req, res, next) => {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    res.json(tags);
  } catch (err) { next(err); }
});
router.post('/tags', authorizeMinRole('teacher'), async (req, res, next) => {
  try {
    const tag = await prisma.tag.upsert({ where: { name: req.body.name }, update: {}, create: { name: req.body.name } });
    res.status(201).json(tag);
  } catch (err) { next(err); }
});
router.delete('/tags/:id', authorize('super_admin', 'academic_admin'), async (req, res, next) => {
  try {
    await prisma.tag.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Đã xóa tag.' });
  } catch (err) { next(err); }
});

module.exports = router;
