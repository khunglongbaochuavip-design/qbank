import { requireAuth, requireMinRole, success, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Generic master data API for grade-levels, cognitive-levels, difficulty-levels, tags
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    switch (type) {
      case 'grade-levels': {
        const items = await prisma.gradeLevel.findMany({ orderBy: { sortOrder: 'asc' } });
        return success(items);
      }
      case 'cognitive-levels': {
        const items = await prisma.cognitiveLevel.findMany({ orderBy: { sortOrder: 'asc' } });
        return success(items);
      }
      case 'difficulty-levels': {
        const items = await prisma.difficultyLevel.findMany({ orderBy: { code: 'asc' } });
        return success(items);
      }
      case 'tags': {
        const items = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
        return success(items);
      }
      default:
        return NextResponse.json({ error: 'Loại dữ liệu không hợp lệ.' }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireMinRole(request, 'admin');
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { type, ...data } = body;

    switch (type) {
      case 'grade-levels': {
        const item = await prisma.gradeLevel.create({ data });
        return success(item, 201);
      }
      case 'cognitive-levels': {
        const item = await prisma.cognitiveLevel.create({ data });
        return success(item, 201);
      }
      case 'difficulty-levels': {
        // Auto-derive minVal/maxVal from sortOrder or use defaults
        const sortMap: Record<string, { minVal: number; maxVal: number }> = {
          'VERY_EASY': { minVal: 0.0, maxVal: 0.2 },
          'EASY':      { minVal: 0.2, maxVal: 0.4 },
          'MEDIUM':    { minVal: 0.4, maxVal: 0.6 },
          'HARD':      { minVal: 0.6, maxVal: 0.8 },
          'VERY_HARD': { minVal: 0.8, maxVal: 1.0 },
        };
        const mapped = sortMap[data.code?.toUpperCase()] || { minVal: 0.0, maxVal: 1.0 };
        const { sortOrder: _ignored, ...restData } = data as any;
        const item = await prisma.difficultyLevel.create({
          data: { ...restData, minVal: mapped.minVal, maxVal: mapped.maxVal },
        });
        return success(item, 201);
      }
      case 'tags': {
        const item = await prisma.tag.upsert({ where: { name: data.name }, update: {}, create: { name: data.name } });
        return success(item, 201);
      }
      default:
        return NextResponse.json({ error: 'Loại dữ liệu không hợp lệ.' }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireMinRole(request, 'admin');
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { type, id, ...data } = body;
    if (!id) return badRequest('Thiếu ID bản ghi.');

    switch (type) {
      case 'grade-levels': {
        const item = await prisma.gradeLevel.update({ where: { id }, data });
        return success(item);
      }
      case 'cognitive-levels': {
        const item = await prisma.cognitiveLevel.update({ where: { id }, data });
        return success(item);
      }
      case 'difficulty-levels': {
        const { sortOrder: _ignored2, minVal, maxVal, ...diffData } = data as any;
        const item = await prisma.difficultyLevel.update({ where: { id }, data: diffData });
        return success(item);
      }
      case 'tags': {
        const item = await prisma.tag.update({ where: { id }, data: { name: data.name } });
        return success(item);
      }
      default:
        return NextResponse.json({ error: 'Loại dữ liệu không hợp lệ.' }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireMinRole(request, 'admin');
    if (user instanceof NextResponse) return user;

    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const id = url.searchParams.get('id');
    if (!id) return badRequest('Thiếu ID bản ghi.');

    switch (type) {
      case 'grade-levels': {
        await prisma.question.updateMany({ where: { gradeLevelId: id }, data: { gradeLevelId: null } });
        await prisma.gradeLevel.delete({ where: { id } });
        return success({ message: 'Đã xóa thành công.' });
      }
      case 'cognitive-levels': {
        await prisma.question.updateMany({ where: { cognitiveLevelId: id }, data: { cognitiveLevelId: null } });
        await prisma.examBlueprintItem.deleteMany({ where: { cognitiveLevelId: id } });
        await prisma.cognitiveLevel.delete({ where: { id } });
        return success({ message: 'Đã xóa thành công.' });
      }
      case 'difficulty-levels': {
        await prisma.examBlueprintItem.deleteMany({ where: { difficultyLevelId: id } });
        await prisma.difficultyLevel.delete({ where: { id } });
        return success({ message: 'Đã xóa thành công.' });
      }
      case 'tags': {
        await prisma.questionTag.deleteMany({ where: { tagId: id } });
        await prisma.tag.delete({ where: { id } });
        return success({ message: 'Đã xóa thành công.' });
      }
      default:
        return NextResponse.json({ error: 'Loại dữ liệu không hợp lệ.' }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
