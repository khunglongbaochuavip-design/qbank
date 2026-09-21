import { requireMinRole, success, badRequest, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET(request: Request) {
  try {
    const user = await requireMinRole(request, 'exam_officer');
    if (user instanceof NextResponse) return user;

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) return badRequest('Thiếu mã phiên thi.');

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: { include: { examQuestions: { include: { question: { include: { subject: true, topic: true } } }, orderBy: { displayOrder: 'asc' } } } },
        attempts: {
          where: { status: { in: ['submitted', 'auto_submitted', 'expired'] } },
          include: {
            student: { select: { id: true, fullName: true, email: true, studentCode: true, className: true } },
            answers: true,
            questions: { orderBy: { displayOrder: 'asc' } },
          },
          orderBy: { score: 'desc' },
        },
      },
    });

    if (!session) return badRequest('Không tìm thấy phiên thi.');

    const wb = new ExcelJS.Workbook();
    const examQuestions = session.exam.examQuestions;

    // Sheet A: Student Summary
    const wsA = wb.addWorksheet('A. Tổng hợp');
    wsA.columns = [
      { header: 'STT', width: 6 },
      { header: 'Mã học sinh', width: 15 },
      { header: 'Họ tên', width: 25 },
      { header: 'Lớp/Nhóm', width: 15 },
      { header: 'Email', width: 30 },
      { header: 'Điểm (thang 10)', width: 15 },
      { header: 'Số câu đúng', width: 13 },
      { header: 'Số câu sai', width: 13 },
      { header: 'Trạng thái', width: 15 },
      { header: 'Thời gian nộp', width: 20 },
    ];
    wsA.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; });

    session.attempts.forEach((att, i) => {
      const s = att.student as { id: string; fullName: string; email: string; studentCode?: string | null; className?: string | null };
      wsA.addRow([i + 1, s.studentCode || s.id.substring(0, 8), s.fullName, s.className || '—', s.email, att.score, att.numCorrect, att.numWrong, att.status, att.submittedAt?.toLocaleString('vi-VN')]);
    });

    // Sheet B: Item Response Matrix (normalized so correct=A)
    const wsB = wb.addWorksheet('B. Ma trận phản hồi');
    const headerB = ['Họ tên', ...examQuestions.map((_, i) => `C${i + 1}`)];
    wsB.addRow(headerB);
    wsB.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; });

    for (const att of session.attempts) {
      const row: (string | null)[] = [att.student.fullName];
      for (const eq of examQuestions) {
        const ans = att.answers.find(a => a.questionId === eq.questionId);
        if (!ans || !ans.originalOption) {
          row.push(null);
          continue;
        }
        // Normalize: map answer to position relative to correct answer
        // Correct answer always maps to "A"
        const correctOption = eq.question.correctOption;
        const options = ['A', 'B', 'C', 'D'];
        const correctIdx = options.indexOf(correctOption);
        const answerIdx = options.indexOf(ans.originalOption);
        const normalizedIdx = ((answerIdx - correctIdx + 4) % 4);
        row.push(options[normalizedIdx]);
      }
      wsB.addRow(row);
    }

    // Sheet C: Item Metadata
    const wsC = wb.addWorksheet('C. Thông tin câu hỏi');
    wsC.columns = [
      { header: 'Câu', width: 8 },
      { header: 'Mã câu hỏi', width: 25 },
      { header: 'Môn', width: 15 },
      { header: 'Chủ đề', width: 20 },
      { header: 'Độ khó', width: 10 },
      { header: 'Đáp án gốc', width: 12 },
    ];
    wsC.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } }; });

    examQuestions.forEach((eq, i) => {
      wsC.addRow([i + 1, eq.question.questionCode, eq.question.subject?.name || '', eq.question.topic?.name || '', eq.question.estimatedDifficulty, eq.question.correctOption]);
    });

    // Sheet D: Detailed Responses
    const wsD = wb.addWorksheet('D. Chi tiết');
    wsD.columns = [
      { header: 'Họ tên', width: 25 },
      { header: 'Câu', width: 8 },
      { header: 'Mã câu hỏi', width: 25 },
      { header: 'Đáp án chọn (hiển thị)', width: 22 },
      { header: 'Đáp án chọn (gốc)', width: 20 },
      { header: 'Đúng/Sai', width: 10 },
    ];
    wsD.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } }; });

    for (const att of session.attempts) {
      for (const eq of examQuestions) {
        const ans = att.answers.find(a => a.questionId === eq.questionId);
        wsD.addRow([att.student.fullName, eq.displayOrder, eq.question.questionCode, ans?.selectedOption || '—', ans?.originalOption || '—', ans?.isCorrect ? 'Đúng' : 'Sai']);
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    await logAction({ userId: user.id, action: 'EXPORT_RESULTS', module: 'RESULT', details: { sessionId }, ipAddress: getClientIP(request) });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=results_${sessionId}.xlsx`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
