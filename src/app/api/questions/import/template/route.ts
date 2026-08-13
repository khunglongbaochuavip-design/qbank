import { requireAuth, success } from '@/lib/api-utils';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Questions');

    ws.columns = [
      { header: 'subject_code *', key: 'subject', width: 18 },
      { header: 'grade_code *', key: 'grade', width: 15 },
      { header: 'domain_code', key: 'domain', width: 18 },
      { header: 'topic_code', key: 'topic', width: 18 },
      { header: 'cognitive_code', key: 'cognitive', width: 20 },
      { header: 'difficulty (0-1)', key: 'difficulty', width: 18 },
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

    // Add example row
    const subjects = await prisma.subject.findMany({ take: 1 });
    ws.addRow({
      subject: subjects[0]?.code || 'TOAN',
      grade: 'L10',
      questionText: 'Nghiệm của phương trình 2x + 4 = 0 là?',
      a: 'x = 2', b: 'x = -2', c: 'x = 4', d: 'x = -4',
      correct: 'B',
      explanation: 'Ta có 2x = -4, x = -2',
      difficulty: '0.3',
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
