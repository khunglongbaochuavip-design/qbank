import { requireMinRole, success, badRequest } from '@/lib/api-utils';
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

    const [subjects, gradeLevels, domains, topics, cogLevels, diffLevels] = await Promise.all([
      prisma.subject.findMany(),
      prisma.gradeLevel.findMany(),
      prisma.domain.findMany(),
      prisma.topic.findMany(),
      prisma.cognitiveLevel.findMany(),
      prisma.difficultyLevel.findMany(),
    ]);

    const gradeMap = Object.fromEntries(gradeLevels.map(g => [g.code.toUpperCase(), g.id]));
    const domainMap = Object.fromEntries(domains.map(d => [d.code.toUpperCase(), d.id]));
    const topicMap = Object.fromEntries(topics.map(t => [t.code.toUpperCase(), t.id]));
    const cogMap = Object.fromEntries(cogLevels.map(c => [c.code.toUpperCase(), c.id]));

    // Difficulty level lookup: match by code, name, or numeric score range
    const diffByCode = Object.fromEntries(diffLevels.map(d => [d.code.toUpperCase(), d.id]));
    const diffByName = Object.fromEntries(diffLevels.map(d => [d.name.toLowerCase().trim(), d.id]));

    const resolveDifficultyId = (valStr: string): { id: string | null; estDiff: number } => {
      if (!valStr) return { id: null, estDiff: 0.5 };

      const clean = valStr.trim();
      const upper = clean.toUpperCase();
      const lower = clean.toLowerCase();

      // Match by code
      if (diffByCode[upper]) return { id: diffByCode[upper], estDiff: 0.5 };

      // Match by name
      if (diffByName[lower]) return { id: diffByName[lower], estDiff: 0.5 };

      // Try numeric float
      const num = parseFloat(clean);
      if (!isNaN(num)) {
        const matched = diffLevels.find(d => num >= d.minVal && num <= d.maxVal);
        return { id: matched ? matched.id : null, estDiff: num };
      }

      return { id: null, estDiff: 0.5 };
    };

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
      const subject = subjects.find(s => s.code.toUpperCase() === subjectCode.toUpperCase());
      if (!subject) {
        preview.push({ row: rowNumber, valid: false, error: `Mã môn học không hợp lệ: "${subjectCode}"` });
        errorCount++;
        return;
      }

      const diffVal = String(v[6] || '').trim();
      const diffResolved = resolveDifficultyId(diffVal);

      validCount++;
      preview.push({
        row: rowNumber, valid: true,
        data: {
          subjectCode, subjectId: subject.id,
          gradeCode: String(v[2] || '').trim(), gradeLevelId: gradeMap[String(v[2] || '').trim().toUpperCase()] || null,
          domainCode: String(v[3] || '').trim(), domainId: domainMap[String(v[3] || '').trim().toUpperCase()] || null,
          topicCode: String(v[4] || '').trim(), topicId: topicMap[String(v[4] || '').trim().toUpperCase()] || null,
          cognitiveLevelId: cogMap[String(v[5] || '').trim().toUpperCase()] || null,
          difficultyLevelId: diffResolved.id,
          estimatedDifficulty: diffResolved.estDiff,
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
