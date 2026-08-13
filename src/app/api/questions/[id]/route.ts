import { requireAuth, success, badRequest, forbidden, notFound, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const questionInclude = {
  subject: true, domain: true, topic: true, gradeLevel: true, cognitiveLevel: true, difficultyLevel: true,
  createdBy: { select: { id: true, fullName: true, email: true } },
  reviewedBy: { select: { id: true, fullName: true, email: true } },
  questionTags: { include: { tag: true } },
  reviewLogs: { orderBy: { changedAt: 'desc' as const } },
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    const q = await prisma.question.findUnique({ where: { id }, include: questionInclude });
    if (!q) return notFound('Không tìm thấy câu hỏi.');

    if (user.role === 'teacher') {
      const assigned = await prisma.teacherSubject.findMany({ where: { userId: user.id } });
      const isCreator = q.createdById === user.id;
      const isInSubject = q.subjectId && assigned.some(a => a.subjectId === q.subjectId);
      if (!isCreator && !isInSubject) return forbidden('Không có quyền xem câu hỏi này.');
    }

    return success(q);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) return notFound('Không tìm thấy câu hỏi.');

    if (user.role === 'teacher') {
      if (existing.createdById !== user.id) return forbidden('Không có quyền.');
      if (!['draft', 'rejected'].includes(existing.status)) {
        return badRequest('Chỉ có thể sửa câu hỏi ở trạng thái nháp hoặc bị từ chối.');
      }
    }

    const body = await request.json();
    const { tagIds, ...rest } = body;

    if (tagIds !== undefined) {
      await prisma.questionTag.deleteMany({ where: { questionId: id } });
      if (tagIds.length > 0) {
        await prisma.questionTag.createMany({ data: tagIds.map((tid: string) => ({ questionId: id, tagId: tid })) });
      }
    }

    // Remove fields that shouldn't be directly updated
    delete rest.status;
    delete rest.createdById;
    delete rest.questionCode;

    if (rest.estimatedDifficulty) rest.estimatedDifficulty = Number(rest.estimatedDifficulty);

    const question = await prisma.question.update({
      where: { id }, data: rest,
      include: { subject: true, domain: true, topic: true, gradeLevel: true, cognitiveLevel: true, difficultyLevel: true,
        createdBy: { select: { id: true, fullName: true } }, questionTags: { include: { tag: true } } },
    });

    await prisma.questionReviewLog.create({
      data: { questionId: id, changedById: user.id, oldStatus: existing.status, newStatus: question.status, comment: 'Cập nhật câu hỏi' },
    });

    return success(question);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) return notFound('Không tìm thấy câu hỏi.');

    if (user.role === 'teacher' && existing.createdById !== user.id) {
      return forbidden('Bạn không có quyền xóa câu hỏi này.');
    }

    // Hard delete: clean up dependent records before removing question
    await prisma.questionTag.deleteMany({ where: { questionId: id } });
    await prisma.questionReviewLog.deleteMany({ where: { questionId: id } });
    await prisma.examAnswer.deleteMany({ where: { questionId: id } });
    await prisma.examAttemptQuestion.deleteMany({ where: { questionId: id } });
    await prisma.examQuestion.deleteMany({ where: { questionId: id } });
    await prisma.question.updateMany({ where: { parentId: id }, data: { parentId: null } });
    await prisma.question.updateMany({ where: { supersededById: id }, data: { supersededById: null } });
    await prisma.question.delete({ where: { id } });

    await logAction({ userId: user.id, action: 'DELETE', module: 'QUESTION', targetId: id, ipAddress: getClientIP(request) });
    return success({ message: 'Đã xóa hoàn toàn câu hỏi.' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
