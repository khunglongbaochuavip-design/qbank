import { requireMinRole, success, badRequest, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(request: Request) {
  try {
    const user = await requireMinRole(request, 'teacher');
    if (user instanceof NextResponse) return user;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return badRequest('Không có file.');

    const arrayBuffer = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wb.xlsx as any).load(arrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return badRequest('File Excel không hợp lệ.');

    const subjects = await prisma.subject.findMany();
    const gradeMap = Object.fromEntries((await prisma.gradeLevel.findMany()).map(g => [g.code, g.id]));
    const domainMap = Object.fromEntries((await prisma.domain.findMany()).map(d => [d.code, d.id]));
    const topicMap = Object.fromEntries((await prisma.topic.findMany()).map(t => [t.code, t.id]));
    const cogMap = Object.fromEntries((await prisma.cognitiveLevel.findMany()).map(c => [c.code, c.id]));

    const preview: { row: number; valid: boolean; error?: string; data?: Record<string, unknown> }[] = [];
    let validCount = 0;
    let errorCount = 0;

    ws.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return; // Skip header

      const v = row.values as (string | number | null)[];
      const subjectCode = String(v[1] || '').trim();
      const questionText = String(v[8] || '').trim();
      const optionA = String(v[9] || '').trim();
      const optionB = String(v[10] || '').trim();
      const optionC = String(v[11] || '').trim();
      const optionD = String(v[12] || '').trim();
      const correctOption = String(v[13] || '').trim().toUpperCase();

      if (!questionText || !optionA || !optionB || !optionC || !optionD) {
        preview.push({ row: rowNumber, valid: false, error: 'Thiếu nội dung câu hỏi hoặc đáp án.' });
        errorCount++;
        return;
      }
      if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
        preview.push({ row: rowNumber, valid: false, error: `Đáp án đúng không hợp lệ: "${correctOption}". Phải là A, B, C hoặc D.` });
        errorCount++;
        return;
      }
      const subject = subjects.find(s => s.code === subjectCode);
      if (!subject) {
        preview.push({ row: rowNumber, valid: false, error: `Mã môn học không hợp lệ: "${subjectCode}"` });
        errorCount++;
        return;
      }

      validCount++;
      preview.push({
        row: rowNumber, valid: true,
        data: {
          subjectCode, subjectId: subject.id,
          gradeCode: String(v[2] || '').trim(), gradeLevelId: gradeMap[String(v[2] || '').trim()] || null,
          domainCode: String(v[3] || '').trim(), domainId: domainMap[String(v[3] || '').trim()] || null,
          topicCode: String(v[4] || '').trim(), topicId: topicMap[String(v[4] || '').trim()] || null,
          cognitiveLevelId: cogMap[String(v[5] || '').trim()] || null,
          estimatedDifficulty: parseFloat(String(v[6] || '0.5')) || 0.5,
          contextText: String(v[7] || '').trim() || null,
          questionText, optionA, optionB, optionC, optionD, correctOption,
          explanation: String(v[14] || '').trim() || null,
          tags: String(v[15] || '').trim() || null,
        },
      });
    });

    // Create batch record
    const batch = await prisma.questionImportBatch.create({
      data: {
        fileName: file.name,
        totalRows: preview.length,
        importedCount: 0,
        errorCount,
        status: 'pending',
        importedById: user.id,
      },
    });

    // Store row data for confirmation
    for (const item of preview) {
      await prisma.questionImportRowLog.create({
        data: {
          batchId: batch.id,
          rowNumber: item.row,
          status: item.valid ? 'pending' : 'error',
          error: item.error || null,
          data: item.data ? JSON.stringify(item.data) : null,
        },
      });
    }

    return success({ batchId: batch.id, totalRows: preview.length, validCount, errorCount, preview: preview.slice(0, 50) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
