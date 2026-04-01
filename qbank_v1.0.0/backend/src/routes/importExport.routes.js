// src/routes/importExport.routes.js
const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeMinRole } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();
router.use(authenticate);

const memStorage = multer.memoryStorage();
const uploadExcel = multer({ storage: memStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── GET /api/import-export/template ─── Download Excel template ─
router.get('/template', async (req, res, next) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Questions');

    ws.columns = [
      { header: 'question_code', key: 'question_code', width: 20 },
      { header: 'subject_code', key: 'subject_code', width: 15 },
      { header: 'domain_code', key: 'domain_code', width: 15 },
      { header: 'topic_code', key: 'topic_code', width: 15 },
      { header: 'grade_code', key: 'grade_code', width: 12 },
      { header: 'cognitive_code', key: 'cognitive_code', width: 15 },
      { header: 'estimated_difficulty', key: 'estimated_difficulty', width: 22 },
      { header: 'context_text', key: 'context_text', width: 30 },
      { header: 'question_text *', key: 'question_text', width: 50 },
      { header: 'option_a *', key: 'option_a', width: 30 },
      { header: 'option_b *', key: 'option_b', width: 30 },
      { header: 'option_c *', key: 'option_c', width: 30 },
      { header: 'option_d *', key: 'option_d', width: 30 },
      { header: 'correct_option * (A/B/C/D)', key: 'correct_option', width: 25 },
      { header: 'explanation', key: 'explanation', width: 40 },
      { header: 'source_reference', key: 'source_reference', width: 25 },
      { header: 'notes', key: 'notes', width: 25 },
      { header: 'tags (comma separated)', key: 'tags', width: 25 },
    ];

    // Style header row
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1890FF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    ws.getRow(1).height = 30;

    // Add sample rows
    const subjects = await prisma.subject.findMany({ take: 3 });
    const domains = await prisma.domain.findMany({ take: 3 });
    const topics = await prisma.topic.findMany({ take: 3 });
    const grades = await prisma.gradeLevel.findMany({ take: 3 });
    const cogs = await prisma.cognitiveLevel.findMany({ take: 3 });

    ws.addRow({
      question_code: '(tùy chọn, để trống tự tạo)',
      subject_code: subjects[0]?.code || 'TOAN',
      domain_code: domains[0]?.code || 'TOAN-DSS',
      topic_code: topics[0]?.code || 'DSS-PT1',
      grade_code: grades[0]?.code || 'L10',
      cognitive_code: cogs[0]?.code || 'NHO',
      estimated_difficulty: 0.3,
      context_text: '(tùy chọn)',
      question_text: 'Nghiệm của phương trình 2x + 4 = 0 là?',
      option_a: 'x = 2', option_b: 'x = -2', option_c: 'x = 4', option_d: 'x = -4',
      correct_option: 'B',
      explanation: 'Ta có 2x = -4, x = -2',
      source_reference: 'SGK Toán 10',
      notes: '',
      tags: 'Ôn tập, THPT Quốc gia',
    });

    // Add reference sheet
    const refWs = wb.addWorksheet('Tham khảo (Reference)');
    refWs.addRow(['=== MÃ MÔN HỌC (subject_code) ===']);
    for (const s of subjects) refWs.addRow([s.code, s.name]);
    refWs.addRow([]);
    refWs.addRow(['=== MÃ LĨNH VỰC (domain_code) ===']);
    const allDomains = await prisma.domain.findMany({ include: { subject: true } });
    for (const d of allDomains) refWs.addRow([d.code, d.name, `(Môn: ${d.subject.name})`]);
    refWs.addRow([]);
    refWs.addRow(['=== MÃ CHỦ ĐỀ (topic_code) ===']);
    const allTopics = await prisma.topic.findMany({ include: { domain: { include: { subject: true } } } });
    for (const t of allTopics) refWs.addRow([t.code, t.name, `(Lĩnh vực: ${t.domain.name})`]);
    refWs.addRow([]);
    refWs.addRow(['=== MÃ KHỐI LỚP (grade_code) ===']);
    const allGrades = await prisma.gradeLevel.findMany();
    for (const g of allGrades) refWs.addRow([g.code, g.name]);
    refWs.addRow([]);
    refWs.addRow(['=== MÃ MỨC NHẬN THỨC (cognitive_code) ===']);
    const allCogs = await prisma.cognitiveLevel.findMany();
    for (const c of allCogs) refWs.addRow([c.code, c.name]);

    res.setHeader('Content-Disposition', 'attachment; filename=qbank_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

// ─── POST /api/import-export/import ─── Import questions ─────────
router.post('/import', authorizeMinRole('teacher'), uploadExcel.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Không có file.' });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.worksheets[0];

    // Load master data for lookup
    const subjects = await prisma.subject.findMany();
    const domains = await prisma.domain.findMany();
    const topics = await prisma.topic.findMany();
    const grades = await prisma.gradeLevel.findMany();
    const cogs = await prisma.cognitiveLevel.findMany();
    const tags = await prisma.tag.findMany();

    const subjectMap = Object.fromEntries(subjects.map(s => [s.code, s.id]));
    const domainMap = Object.fromEntries(domains.map(d => [d.code, d.id]));
    const topicMap = Object.fromEntries(topics.map(t => [t.code, t.id]));
    const gradeMap = Object.fromEntries(grades.map(g => [g.code, g.id]));
    const cogMap = Object.fromEntries(cogs.map(c => [c.code, c.id]));
    const tagMap = Object.fromEntries(tags.map(t => [t.name, t.id]));

    const results = { imported: 0, errors: [] };
    const totalQ = await prisma.question.count();
    let qIdx = totalQ;

    ws.eachRow(async (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const vals = row.values; // 1-indexed

      const questionText = String(vals[9] || '').trim();
      const optionA = String(vals[10] || '').trim();
      const optionB = String(vals[11] || '').trim();
      const optionC = String(vals[12] || '').trim();
      const optionD = String(vals[13] || '').trim();
      const correctOption = String(vals[14] || '').trim().toUpperCase();

      if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctOption) {
        results.errors.push({ row: rowNumber, error: 'Thiếu các trường bắt buộc (câu hỏi, 4 lựa chọn, đáp án đúng)' });
        return;
      }
      if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
        results.errors.push({ row: rowNumber, error: 'Đáp án đúng phải là A, B, C hoặc D' });
        return;
      }
    });

    // Process rows synchronously after validation pass
    const rows = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber > 1) rows.push({ row, rowNumber });
    });

    for (const { row, rowNumber } of rows) {
      const vals = row.values;
      const questionText = String(vals[9] || '').trim();
      const optionA = String(vals[10] || '').trim();
      const optionB = String(vals[11] || '').trim();
      const optionC = String(vals[12] || '').trim();
      const optionD = String(vals[13] || '').trim();
      const correctOption = String(vals[14] || '').trim().toUpperCase();

      if (!questionText || !optionA || !optionB || !optionC || !optionD || !['A','B','C','D'].includes(correctOption)) continue;

      const subjectCode = String(vals[2] || '').trim();
      const domainCode = String(vals[3] || '').trim();
      const topicCode = String(vals[4] || '').trim();
      const gradeCode = String(vals[5] || '').trim();
      const cogCode = String(vals[6] || '').trim();
      const estDiff = parseFloat(vals[7]) || 0.5;
      const contextText = String(vals[8] || '').trim() || null;
      const explanation = String(vals[15] || '').trim() || null;
      const sourceRef = String(vals[16] || '').trim() || null;
      const notes = String(vals[17] || '').trim() || null;
      const tagNames = String(vals[18] || '').split(',').map(t => t.trim()).filter(Boolean);

      qIdx++;
      const subjectId = subjectMap[subjectCode] || null;
      const prefix = subjectCode || 'Q';
      const questionCode = `IMP-${prefix}-${String(qIdx).padStart(4, '0')}`;

      try {
        // Create/fetch tags
        const tagIds = [];
        for (const tagName of tagNames) {
          if (!tagName) continue;
          let tagId = tagMap[tagName];
          if (!tagId) {
            const newTag = await prisma.tag.create({ data: { name: tagName } });
            tagId = newTag.id;
            tagMap[tagName] = tagId;
          }
          tagIds.push(tagId);
        }

        await prisma.question.create({
          data: {
            questionCode,
            questionText, optionA, optionB, optionC, optionD, correctOption,
            subjectId, domainId: domainMap[domainCode] || null, topicId: topicMap[topicCode] || null,
            gradeLevelId: gradeMap[gradeCode] || null, cognitiveLevelId: cogMap[cogCode] || null,
            estimatedDifficulty: estDiff,
            contextText, explanation, sourceReference: sourceRef, notes,
            status: 'draft',
            createdById: req.user.id,
            questionTags: tagIds.length ? { create: tagIds.map(id => ({ tagId: id })) } : undefined,
          },
        });
        results.imported++;
      } catch (e) {
        results.errors.push({ row: rowNumber, error: e.message });
      }
    }

    res.json(results);
  } catch (err) { next(err); }
});

// ─── GET /api/import-export/export ─── Export filtered questions ──
router.get('/export', authorizeMinRole('teacher'), async (req, res, next) => {
  try {
    const { subjectId, domainId, topicId, status, cognitiveLevelId } = req.query;
    const where = {};
    if (req.user.role === 'teacher') where.createdById = req.user.id;
    if (subjectId) where.subjectId = Number(subjectId);
    if (domainId) where.domainId = Number(domainId);
    if (topicId) where.topicId = Number(topicId);
    if (status) where.status = status;
    if (cognitiveLevelId) where.cognitiveLevelId = Number(cognitiveLevelId);

    const questions = await prisma.question.findMany({
      where,
      include: {
        subject: true, domain: true, topic: true,
        gradeLevel: true, cognitiveLevel: true,
        createdBy: { select: { fullName: true } },
        questionTags: { include: { tag: true } },
      },
      orderBy: { questionCode: 'asc' },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Questions');
    ws.columns = [
      { header: 'Mã câu hỏi', key: 'code', width: 20 },
      { header: 'Môn học', key: 'subject', width: 15 },
      { header: 'Lĩnh vực', key: 'domain', width: 20 },
      { header: 'Chủ đề', key: 'topic', width: 20 },
      { header: 'Khối lớp', key: 'grade', width: 12 },
      { header: 'Mức nhận thức', key: 'cognitive', width: 18 },
      { header: 'Độ khó ước tính', key: 'estDiff', width: 18 },
      { header: 'Độ khó thực nghiệm', key: 'empDiff', width: 20 },
      { header: 'Độ khó chính thức', key: 'finalDiff', width: 20 },
      { header: 'Dẫn ngữ', key: 'context', width: 30 },
      { header: 'Nội dung câu hỏi', key: 'questionText', width: 50 },
      { header: 'Lựa chọn A', key: 'a', width: 30 },
      { header: 'Lựa chọn B', key: 'b', width: 30 },
      { header: 'Lựa chọn C', key: 'c', width: 30 },
      { header: 'Lựa chọn D', key: 'd', width: 30 },
      { header: 'Đáp án đúng', key: 'correct', width: 15 },
      { header: 'Giải thích', key: 'explanation', width: 40 },
      { header: 'Trạng thái', key: 'status', width: 18 },
      { header: 'Người tạo', key: 'creator', width: 20 },
      { header: 'Tags', key: 'tags', width: 25 },
      { header: 'Số lần sử dụng', key: 'usage', width: 18 },
    ];

    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1890FF' } };
    });

    const statusLabels = { draft: 'Nháp', pending_review: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', archived: 'Lưu trữ' };

    for (const q of questions) {
      ws.addRow({
        code: q.questionCode,
        subject: q.subject?.name || '',
        domain: q.domain?.name || '',
        topic: q.topic?.name || '',
        grade: q.gradeLevel?.name || '',
        cognitive: q.cognitiveLevel?.name || '',
        estDiff: q.estimatedDifficulty,
        empDiff: q.empiricalDifficulty ?? '',
        finalDiff: q.finalDifficulty ?? '',
        context: q.contextText || '',
        questionText: q.questionText,
        a: q.optionA, b: q.optionB, c: q.optionC, d: q.optionD,
        correct: q.correctOption,
        explanation: q.explanation || '',
        status: statusLabels[q.status] || q.status,
        creator: q.createdBy?.fullName || '',
        tags: q.questionTags.map(qt => qt.tag.name).join(', '),
        usage: q.usageCount,
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename=questions_export_${Date.now()}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

module.exports = router;
