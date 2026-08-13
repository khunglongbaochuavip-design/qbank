import { requireMinRole, success, badRequest, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const user = await requireMinRole(request, 'teacher');
    if (user instanceof NextResponse) return user;

    const { batchId } = await request.json();
    if (!batchId) return badRequest('Thiếu mã lô nhập.');

    const batch = await prisma.questionImportBatch.findUnique({ where: { id: batchId } });
    if (!batch) return badRequest('Không tìm thấy lô nhập.');
    if (batch.status !== 'pending') return badRequest('Lô nhập đã được xử lý.');

    const rows = await prisma.questionImportRowLog.findMany({
      where: { batchId, status: 'pending' },
      orderBy: { rowNumber: 'asc' },
    });

    let imported = 0;
    let errors = 0;
    const totalQ = await prisma.question.count();
    let qIdx = totalQ;

    for (const row of rows) {
      if (!row.data) continue;
      const data = JSON.parse(row.data);

      try {
        const timestamp = Date.now().toString(36).toUpperCase();
        const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
        const questionCode = `Q${timestamp}${rand}`;

        // Handle tags
        let tagCreate = undefined;
        if (data.tags) {
          const tagNames = data.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
          const tagIds: string[] = [];
          for (const tagName of tagNames) {
            const tag = await prisma.tag.upsert({ where: { name: tagName }, update: {}, create: { name: tagName } });
            tagIds.push(tag.id);
          }
          if (tagIds.length > 0) {
            tagCreate = { create: tagIds.map(id => ({ tagId: id })) };
          }
        }

        await prisma.question.create({
          data: {
            questionCode,
            questionText: data.questionText,
            optionA: data.optionA, optionB: data.optionB,
            optionC: data.optionC, optionD: data.optionD,
            correctOption: data.correctOption,
            subjectId: data.subjectId || null,
            gradeLevelId: data.gradeLevelId || null,
            domainId: data.domainId || null,
            topicId: data.topicId || null,
            cognitiveLevelId: data.cognitiveLevelId || null,
            difficultyLevelId: data.difficultyLevelId || null,
            estimatedDifficulty: data.estimatedDifficulty || 0.5,
            contextText: data.contextText || null,
            explanation: data.explanation || null,
            status: 'draft',
            createdById: user.id,
            questionTags: tagCreate,
          },
        });

        await prisma.questionImportRowLog.update({
          where: { id: row.id }, data: { status: 'success' },
        });
        imported++;
      } catch (e) {
        await prisma.questionImportRowLog.update({
          where: { id: row.id }, data: { status: 'error', error: (e as Error).message },
        });
        errors++;
      }
    }

    await prisma.questionImportBatch.update({
      where: { id: batchId },
      data: { status: 'confirmed', importedCount: imported, errorCount: errors, confirmedAt: new Date() },
    });

    await logAction({ userId: user.id, action: 'IMPORT', module: 'QUESTION', details: { batchId, imported, errors }, ipAddress: getClientIP(request) });
    return success({ imported, errors, batchId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
