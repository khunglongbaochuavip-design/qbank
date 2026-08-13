import { requireAuth, success, badRequest, forbidden, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const questionInclude = {
  subject: true, domain: true, topic: true, gradeLevel: true, cognitiveLevel: true, difficultyLevel: true,
  createdBy: { select: { id: true, fullName: true, email: true } },
  reviewedBy: { select: { id: true, fullName: true, email: true } },
  questionTags: { include: { tag: true } },
};

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (user.role === 'student') return forbidden('Không có quyền truy cập.');

    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const subjectId = url.searchParams.get('subjectId');
    const domainId = url.searchParams.get('domainId');
    const topicId = url.searchParams.get('topicId');
    const gradeLevelId = url.searchParams.get('gradeLevelId');
    const cognitiveLevelId = url.searchParams.get('cognitiveLevelId');
    const status = url.searchParams.get('status');
    const createdById = url.searchParams.get('createdById');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

    const where: Record<string, unknown> = {};

    // Teacher restrictions
    if (user.role === 'teacher') {
      where.createdById = user.id;
      const assigned = await prisma.teacherSubject.findMany({ where: { userId: user.id } });
      if (assigned.length > 0) {
        where.subjectId = { in: assigned.map(a => a.subjectId) };
      }
    }

    if (search) {
      where.OR = [
        { questionCode: { contains: search, mode: 'insensitive' } },
        { questionText: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (subjectId) where.subjectId = subjectId;
    if (domainId) where.domainId = domainId;
    if (topicId) where.topicId = topicId;
    if (gradeLevelId) where.gradeLevelId = gradeLevelId;
    if (cognitiveLevelId) where.cognitiveLevelId = cognitiveLevelId;
    if (status) where.status = status;
    if (createdById) where.createdById = createdById;

    const skip = (page - 1) * pageSize;
    const [total, questions] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where, include: questionInclude,
        orderBy: { createdAt: 'desc' }, skip, take: pageSize,
      }),
    ]);

    return success({ total, page, pageSize, data: questions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (!['super_admin', 'admin', 'teacher', 'exam_officer'].includes(user.role)) {
      return forbidden('Không có quyền tạo câu hỏi.');
    }

    const body = await request.json();
    const { questionText, optionA, optionB, optionC, optionD, correctOption,
      subjectId, domainId, topicId, gradeLevelId, cognitiveLevelId, difficultyLevelId,
      estimatedDifficulty, contextText, explanation, sourceReference,
      status: reqStatus, tagIds } = body;

    if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctOption) {
      return badRequest('Thiếu các trường bắt buộc.');
    }
    if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
      return badRequest('Đáp án đúng phải là A, B, C hoặc D.');
    }

    // Teacher subject check
    if (user.role === 'teacher' && subjectId) {
      const assigned = await prisma.teacherSubject.findUnique({
        where: { userId_subjectId: { userId: user.id, subjectId } },
      });
      if (!assigned) return forbidden('Bạn chỉ có thể tạo câu hỏi trong môn học được phân công.');
    }

    // Use timestamp + random suffix to avoid collision when questions are deleted or concurrent creates
    const timestamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    const questionCode = `Q${timestamp}${rand}`;

    const newStatus = (['super_admin', 'admin', 'exam_officer'].includes(user.role) && reqStatus)
      ? reqStatus : 'draft';

    const question = await prisma.question.create({
      data: {
        questionCode, questionText,
        optionA, optionB, optionC, optionD, correctOption,
        subjectId: subjectId || null, domainId: domainId || null,
        topicId: topicId || null, gradeLevelId: gradeLevelId || null,
        cognitiveLevelId: cognitiveLevelId || null,
        difficultyLevelId: difficultyLevelId || null,
        estimatedDifficulty: estimatedDifficulty ? Number(estimatedDifficulty) : 0.5,
        contextText, explanation, sourceReference,
        status: newStatus as 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived',
        createdById: user.id,
        questionTags: tagIds?.length ? { create: tagIds.map((id: string) => ({ tagId: id })) } : undefined,
      },
      include: questionInclude,
    });

    await prisma.questionReviewLog.create({
      data: { questionId: question.id, changedById: user.id, oldStatus: null, newStatus, comment: 'Tạo câu hỏi mới' },
    });

    await logAction({ userId: user.id, action: 'CREATE', module: 'QUESTION', targetId: question.id, ipAddress: getClientIP(request) });
    return success(question, 201);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
