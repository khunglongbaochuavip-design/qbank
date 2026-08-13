import { requireAuth } from '@/lib/api-utils';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    const wb = new ExcelJS.Workbook();
    
    // Sheet 1: Main import template
    const ws = wb.addWorksheet('Nhập_Câu_Hỏi');

    ws.columns = [
      { header: 'subject_code *', key: 'subject', width: 18 },
      { header: 'grade_code *', key: 'grade', width: 15 },
      { header: 'domain_code', key: 'domain', width: 18 },
      { header: 'topic_code', key: 'topic', width: 18 },
      { header: 'cognitive_code', key: 'cognitive', width: 20 },
      { header: 'difficulty (Mức khó)', key: 'difficulty', width: 22 },
      { header: 'context', key: 'context', width: 30 },
      { header: 'question_text *', key: 'questionText', width: 50 },
      { header: 'option_a *', key: 'a', width: 30 },
      { header: 'option_b *', key: 'b', width: 30 },
      { header: 'option_c *', key: 'c', width: 30 },
      { header: 'option_d *', key: 'd', width: 30 },
      { header: 'correct_answer * (A/B/C/D)', key: 'correct', width: 25 },
      { header: 'explanation', key: 'explanation', width: 40 },
      { header: 'tags', key: 'tags', width: 25 },
    ];

    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1890FF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    // Example row
    const subjects = await prisma.subject.findMany({ take: 1 });
    ws.addRow({
      subject: subjects[0]?.code || 'TOAN',
      grade: 'G10',
      domain: 'MATH_DS',
      topic: 'MATH_DS_HS',
      cognitive: 'NB',
      difficulty: 'Dễ', // Or EASY, Rất dễ, Trung bình, Khó, Rất khó
      questionText: 'Nghiệm của phương trình 2x + 4 = 0 là?',
      a: 'x = 2', b: 'x = -2', c: 'x = 4', d: 'x = -4',
      correct: 'B',
      explanation: 'Ta có 2x = -4, x = -2',
      tags: 'ĐạiSố, PhươngTrình',
    });

    // Sheet 2: Guide / Reference Master Data
    const guideWs = wb.addWorksheet('Hướng_Dẫn_Mã_Danh_Mục');

    // Fetch master data for guidance
    const [diffLevels, cogLevels, grades, subjectsList] = await Promise.all([
      prisma.difficultyLevel.findMany({ orderBy: { code: 'asc' } }),
      prisma.cognitiveLevel.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.gradeLevel.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.subject.findMany({ select: { code: true, name: true } }),
    ]);

    guideWs.columns = [
      { header: 'Mục', key: 'type', width: 20 },
      { header: 'Mã (Code)', key: 'code', width: 20 },
      { header: 'Tên hiển thị (Tên hợp lệ)', key: 'name', width: 30 },
      { header: 'Mô tả / Ghi chú', key: 'note', width: 35 },
    ];

    guideWs.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF52C41A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    diffLevels.forEach(d => {
      guideWs.addRow({ type: 'Mức độ khó', code: d.code, name: d.name, note: 'Nhập Mã hoặc Tên đều được' });
    });
    cogLevels.forEach(c => {
      guideWs.addRow({ type: 'Mức nhận thức', code: c.code, name: c.name, note: 'Nhập Mã' });
    });
    grades.forEach(g => {
      guideWs.addRow({ type: 'Khối lớp', code: g.code, name: g.name, note: 'Nhập Mã' });
    });
    subjectsList.forEach(s => {
      guideWs.addRow({ type: 'Môn học', code: s.code, name: s.name, note: 'Nhập Mã' });
    });

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=qbank_template.xlsx',
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
