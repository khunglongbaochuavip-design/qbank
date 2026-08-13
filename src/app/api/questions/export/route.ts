import { requireAuth } from '@/lib/api-utils';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import prisma from '@/lib/prisma';
import { QUESTION_STATUS_LABELS } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    const url = new URL(request.url);
    const subjectId = url.searchParams.get('subjectId');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (subjectId) where.subjectId = subjectId;
    if (status) where.status = status;

    if (user.role === 'teacher') {
      where.createdById = user.id;
    }

    if (search) {
      where.OR = [
        { questionCode: { contains: search, mode: 'insensitive' } },
        { questionText: { contains: search, mode: 'insensitive' } },
      ];
    }

    const questions = await prisma.question.findMany({
      where,
      include: {
        subject: true,
        gradeLevel: true,
        domain: true,
        topic: true,
        cognitiveLevel: true,
        difficultyLevel: true,
        createdBy: { select: { fullName: true } },
        questionTags: { include: { tag: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Danh_Sách_Câu_Hỏi');

    ws.columns = [
      { header: 'Mã câu hỏi', key: 'code', width: 16 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Môn học', key: 'subject', width: 18 },
      { header: 'Khối lớp', key: 'grade', width: 14 },
      { header: 'Lĩnh vực', key: 'domain', width: 18 },
      { header: 'Chủ đề', key: 'topic', width: 20 },
      { header: 'Mức nhận thức', key: 'cognitive', width: 16 },
      { header: 'Mức độ khó', key: 'difficulty', width: 16 },
      { header: 'Thẻ (Tags)', key: 'tags', width: 22 },
      { header: 'Nội dung câu hỏi', key: 'questionText', width: 45 },
      { header: 'Đáp án A', key: 'a', width: 25 },
      { header: 'Đáp án B', key: 'b', width: 25 },
      { header: 'Đáp án C', key: 'c', width: 25 },
      { header: 'Đáp án D', key: 'd', width: 25 },
      { header: 'Đáp án đúng', key: 'correct', width: 14 },
      { header: 'Giải thích', key: 'explanation', width: 35 },
      { header: 'Người tạo', key: 'creator', width: 20 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
    ];

    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1890FF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    questions.forEach(q => {
      const tagsStr = q.questionTags.map(qt => qt.tag.name).join(', ');
      const diffName = q.difficultyLevel?.name || (q.estimatedDifficulty ? `Độ khó ${q.estimatedDifficulty}` : '—');
      const cleanText = (txt?: string | null) => txt ? txt.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : '';

      ws.addRow({
        code: q.questionCode,
        status: QUESTION_STATUS_LABELS[q.status] || q.status,
        subject: q.subject?.name || '—',
        grade: q.gradeLevel?.name || '—',
        domain: q.domain?.name || '—',
        topic: q.topic?.name || '—',
        cognitive: q.cognitiveLevel?.name || '—',
        difficulty: diffName,
        tags: tagsStr || '—',
        questionText: cleanText(q.questionText),
        a: cleanText(q.optionA),
        b: cleanText(q.optionB),
        c: cleanText(q.optionC),
        d: cleanText(q.optionD),
        correct: q.correctOption,
        explanation: cleanText(q.explanation),
        creator: q.createdBy?.fullName || '—',
        createdAt: q.createdAt ? new Date(q.createdAt).toLocaleString('vi-VN') : '',
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=qbank_questions_export.xlsx',
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
