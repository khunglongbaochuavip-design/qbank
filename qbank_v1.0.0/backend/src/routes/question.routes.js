// src/routes/question.routes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize, authorizeMinRole } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authenticate);

// ─── File upload config ───────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const types = /jpeg|jpg|png|gif|webp/;
  if (types.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
  else cb(new Error('Chỉ chấp nhận file ảnh (jpeg, png, gif, webp)'));
}});

// ─── Include block for relations ──────────────────────────────────
const questionInclude = {
  subject: true,
  domain: true,
  topic: true,
  gradeLevel: true,
  cognitiveLevel: true,
  createdBy: { select: { id: true, fullName: true, email: true } },
  reviewedBy: { select: { id: true, fullName: true, email: true } },
  questionTags: { include: { tag: true } },
};

// ─── GET /api/questions ───────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const {
      search, subjectId, domainId, topicId, gradeLevelId,
      cognitiveLevelId, status, createdById, hasImage,
      difficulty, page = 1, pageSize = 20,
    } = req.query;

    const where = {};

    // Role restrictions: teachers only see their own questions
    if (req.user.role === 'student') {
      return res.status(403).json({ error: 'Không có quyền truy cập.' });
    }
    if (req.user.role === 'teacher') {
      where.createdById = req.user.id;
    }

    if (search) {
      where.OR = [
        { questionCode: { contains: search } },
        { questionText: { contains: search } },
        { contextText: { contains: search } },
      ];
    }
    if (subjectId) where.subjectId = Number(subjectId);
    if (domainId) where.domainId = Number(domainId);
    if (topicId) where.topicId = Number(topicId);
    if (gradeLevelId) where.gradeLevelId = Number(gradeLevelId);
    if (cognitiveLevelId) where.cognitiveLevelId = Number(cognitiveLevelId);
    if (status) where.status = status;
    if (createdById) where.createdById = Number(createdById);
    if (hasImage === 'true') where.questionImage = { not: null };
    if (hasImage === 'false') where.questionImage = null;
    if (difficulty) {
      const [min, max] = difficulty.split('-').map(Number);
      where.estimatedDifficulty = { gte: min, lte: max };
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const [total, questions] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        include: questionInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(pageSize),
      }),
    ]);

    res.json({ total, page: Number(page), pageSize: Number(pageSize), data: questions });
  } catch (err) { next(err); }
});

// ─── GET /api/questions/:id ───────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const q = await prisma.question.findUnique({
      where: { id: Number(req.params.id) },
      include: { ...questionInclude, questionHistory: { include: { changedBy: { select: { id: true, fullName: true } } }, orderBy: { changedAt: 'desc' } } },
    });
    if (!q) return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' });
    // Teachers can only see their own
    if (req.user.role === 'teacher' && q.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xem câu hỏi này.' });
    }
    res.json(q);
  } catch (err) { next(err); }
});

// ─── POST /api/questions ─── Create ──────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    if (!['super_admin', 'academic_admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Không có quyền tạo câu hỏi.' });
    }
    const {
      questionText, optionA, optionB, optionC, optionD, correctOption,
      subjectId, domainId, topicId, gradeLevelId, cognitiveLevelId,
      estimatedDifficulty, contextText, explanation, sourceReference, notes,
      status: reqStatus, tagIds,
    } = req.body;

    if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctOption) {
      return res.status(400).json({ error: 'Thiếu các trường bắt buộc.' });
    }
    if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
      return res.status(400).json({ error: 'Đáp án đúng phải là A, B, C hoặc D.' });
    }

    // Generate unique question code
    const prefix = subjectId ? (await prisma.subject.findUnique({ where: { id: Number(subjectId) } }))?.code || 'Q' : 'Q';
    const count = await prisma.question.count();
    const questionCode = `${prefix}-${String(count + 1).padStart(5, '0')}`;

    // Only admin can set status to something other than draft
    const newStatus = (req.user.role === 'super_admin' || req.user.role === 'academic_admin') && reqStatus
      ? reqStatus : 'draft';

    const question = await prisma.question.create({
      data: {
        questionCode,
        questionText,
        optionA, optionB, optionC, optionD, correctOption,
        subjectId: subjectId ? Number(subjectId) : null,
        domainId: domainId ? Number(domainId) : null,
        topicId: topicId ? Number(topicId) : null,
        gradeLevelId: gradeLevelId ? Number(gradeLevelId) : null,
        cognitiveLevelId: cognitiveLevelId ? Number(cognitiveLevelId) : null,
        estimatedDifficulty: estimatedDifficulty ? Number(estimatedDifficulty) : 0.5,
        contextText, explanation, sourceReference, notes,
        status: newStatus,
        createdById: req.user.id,
        questionTags: tagIds?.length ? { create: tagIds.map(id => ({ tagId: Number(id) })) } : undefined,
      },
      include: questionInclude,
    });

    await prisma.questionHistory.create({
      data: { questionId: question.id, changedById: req.user.id, oldStatus: null, newStatus, comment: 'Tạo câu hỏi mới' },
    });

    res.status(201).json(question);
  } catch (err) { next(err); }
});

// ─── PUT /api/questions/:id ─── Update ───────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' });

    // Teachers can only edit their own questions in draft/rejected state
    if (req.user.role === 'teacher') {
      if (existing.createdById !== req.user.id) return res.status(403).json({ error: 'Không có quyền.' });
      if (!['draft', 'rejected'].includes(existing.status)) return res.status(400).json({ error: 'Chỉ có thể sửa câu hỏi ở trạng thái nháp hoặc bị từ chối.' });
    }

    const { tagIds, status: reqStatus, ...rest } = req.body;

    // Process numeric fields
    if (rest.subjectId) rest.subjectId = Number(rest.subjectId);
    if (rest.domainId) rest.domainId = Number(rest.domainId);
    if (rest.topicId) rest.topicId = Number(rest.topicId);
    if (rest.gradeLevelId) rest.gradeLevelId = Number(rest.gradeLevelId);
    if (rest.cognitiveLevelId) rest.cognitiveLevelId = Number(rest.cognitiveLevelId);
    if (rest.estimatedDifficulty) rest.estimatedDifficulty = Number(rest.estimatedDifficulty);

    // Update tags if provided
    if (tagIds !== undefined) {
      await prisma.questionTag.deleteMany({ where: { questionId: id } });
      if (tagIds.length > 0) {
        await prisma.questionTag.createMany({ data: tagIds.map(tid => ({ questionId: id, tagId: Number(tid) })) });
      }
    }

    const question = await prisma.question.update({
      where: { id },
      data: { ...rest, updatedAt: new Date() },
      include: questionInclude,
    });

    await prisma.questionHistory.create({
      data: { questionId: id, changedById: req.user.id, oldStatus: existing.status, newStatus: question.status, comment: 'Cập nhật câu hỏi' },
    });

    res.json(question);
  } catch (err) { next(err); }
});

// ─── POST /api/questions/:id/image ─── Upload image ──────────────
router.post('/:id/image', upload.single('image'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!req.file) return res.status(400).json({ error: 'Không có file ảnh.' });
    const imageUrl = `/uploads/${req.file.filename}`;
    await prisma.question.update({ where: { id }, data: { questionImage: imageUrl } });
    res.json({ imageUrl });
  } catch (err) { next(err); }
});

// ─── POST /api/questions/:id/submit ─── Submit for review ────────
router.post('/:id/submit', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const q = await prisma.question.findUnique({ where: { id } });
    if (!q) return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' });
    if (req.user.role === 'teacher' && q.createdById !== req.user.id) return res.status(403).json({ error: 'Không có quyền.' });
    if (!['draft', 'rejected'].includes(q.status)) return res.status(400).json({ error: 'Chỉ có thể gửi câu hỏi ở trạng thái nháp hoặc bị từ chối.' });

    await prisma.question.update({ where: { id }, data: { status: 'pending_review' } });
    await prisma.questionHistory.create({
      data: { questionId: id, changedById: req.user.id, oldStatus: q.status, newStatus: 'pending_review', comment: 'Gửi phê duyệt' },
    });
    res.json({ message: 'Đã gửi câu hỏi để phê duyệt.' });
  } catch (err) { next(err); }
});

// ─── POST /api/questions/:id/approve ─────────────────────────────
router.post('/:id/approve', authorizeMinRole('academic_admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const q = await prisma.question.findUnique({ where: { id } });
    if (!q) return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' });
    if (q.status !== 'pending_review') return res.status(400).json({ error: 'Câu hỏi không ở trạng thái chờ phê duyệt.' });

    await prisma.question.update({ where: { id }, data: { status: 'approved', reviewedById: req.user.id, approvedAt: new Date() } });
    await prisma.questionHistory.create({
      data: { questionId: id, changedById: req.user.id, oldStatus: 'pending_review', newStatus: 'approved', comment: req.body.comment || 'Đã phê duyệt' },
    });
    res.json({ message: 'Câu hỏi đã được phê duyệt.' });
  } catch (err) { next(err); }
});

// ─── POST /api/questions/:id/reject ──────────────────────────────
router.post('/:id/reject', authorizeMinRole('academic_admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const q = await prisma.question.findUnique({ where: { id } });
    if (!q) return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' });
    if (q.status !== 'pending_review') return res.status(400).json({ error: 'Câu hỏi không ở trạng thái chờ phê duyệt.' });

    await prisma.question.update({ where: { id }, data: { status: 'rejected', reviewedById: req.user.id } });
    await prisma.questionHistory.create({
      data: { questionId: id, changedById: req.user.id, oldStatus: 'pending_review', newStatus: 'rejected', comment: req.body.comment || 'Không đạt yêu cầu' },
    });
    res.json({ message: 'Câu hỏi đã bị từ chối.' });
  } catch (err) { next(err); }
});

// ─── POST /api/questions/:id/duplicate ────────────────────────────
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Không có quyền.' });
    const id = Number(req.params.id);
    const original = await prisma.question.findUnique({ where: { id }, include: { questionTags: true } });
    if (!original) return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' });

    const count = await prisma.question.count();
    const { id: _id, questionCode: _code, status: _s, createdAt: _ca, updatedAt: _ua, approvedAt: _aa,
      reviewedById: _rb, usageCount: _uc, questionTags, ...rest } = original;

    const newQuestion = await prisma.question.create({
      data: {
        ...rest,
        questionCode: `COPY-${String(count + 1).padStart(5, '0')}`,
        status: 'draft',
        createdById: req.user.id,
        reviewedById: null,
        approvedAt: null,
        usageCount: 0,
        questionTags: questionTags.length ? { create: questionTags.map(qt => ({ tagId: qt.tagId })) } : undefined,
      },
      include: questionInclude,
    });
    await prisma.questionHistory.create({
      data: { questionId: newQuestion.id, changedById: req.user.id, oldStatus: null, newStatus: 'draft', comment: `Sao chép từ câu hỏi #${id}` },
    });
    res.status(201).json(newQuestion);
  } catch (err) { next(err); }
});

// ─── PUT /api/questions/:id/difficulty ─── Update difficulty ──────
router.put('/:id/difficulty', authorizeMinRole('academic_admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { empiricalDifficulty, finalDifficulty } = req.body;
    const data = {};
    if (empiricalDifficulty !== undefined) data.empiricalDifficulty = Number(empiricalDifficulty);
    if (finalDifficulty !== undefined) data.finalDifficulty = Number(finalDifficulty);
    const q = await prisma.question.update({ where: { id }, data });
    await prisma.questionHistory.create({
      data: { questionId: id, changedById: req.user.id, oldStatus: q.status, newStatus: q.status, comment: `Cập nhật độ khó: empirical=${empiricalDifficulty}, final=${finalDifficulty}` },
    });
    res.json(q);
  } catch (err) { next(err); }
});

// ─── DELETE /api/questions/:id ────────────────────────────────────
router.delete('/:id', authorizeMinRole('academic_admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.question.update({ where: { id }, data: { status: 'archived' } });
    await prisma.questionHistory.create({
      data: { questionId: id, changedById: req.user.id, oldStatus: 'approved', newStatus: 'archived', comment: 'Lưu trữ câu hỏi' },
    });
    res.json({ message: 'Câu hỏi đã được lưu trữ.' });
  } catch (err) { next(err); }
});

module.exports = router;
