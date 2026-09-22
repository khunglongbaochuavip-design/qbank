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

    // Sheet B: Item Response Matrix (chuẩn phân tích tâm trắc)
    // Hàng 1: A1="Họ và tên", B1..=mã câu hỏi
    // Hàng 2: A2="Đáp án", B2..=đáp án gốc đúng của từng câu
    // Hàng 3+: tên thí sinh + lựa chọn đã quy về đáp án gốc
    const wsB = wb.addWorksheet('B. Ma trận phản hồi');

    // Row 1: headers — question codes
    const row1Values = ['Họ và tên', ...examQuestions.map((eq, i) => eq.question.questionCode || `C${i + 1}`)];
    const row1 = wsB.addRow(row1Values);
    row1.eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    wsB.getColumn(1).width = 28;
    examQuestions.forEach((_, i) => { wsB.getColumn(i + 2).width = Math.max(14, (examQuestions[i].question.questionCode || `C${i+1}`).length + 4); });

    // Row 2: correct answer key
    const row2Values = ['Đáp án', ...examQuestions.map(eq => eq.question.correctOption)];
    const row2 = wsB.addRow(row2Values);
    row2.getCell(1).font = { bold: true, italic: true };
    row2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
    row2.eachCell((c, col) => {
      if (col > 1) {
        c.font = { bold: true, color: { argb: 'FF16A34A' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        c.alignment = { horizontal: 'center' };
      }
    });

    // Rows 3+: each student's answers (originalOption — already mapped back to original key)
    for (const att of session.attempts) {
      const s = att.student as { id: string; fullName: string; studentCode?: string | null };
      const label = s.studentCode ? `${s.studentCode} — ${att.student.fullName}` : att.student.fullName;
      const rowData: (string | null)[] = [label];
      for (const eq of examQuestions) {
        const ans = att.answers.find(a => a.questionId === eq.questionId);
        rowData.push(ans?.originalOption || null);
      }
      const r = wsB.addRow(rowData);
      r.eachCell((c, col) => {
        if (col > 1) {
          c.alignment = { horizontal: 'center' };
          // Highlight correct answers green, wrong answers red
          const correct = examQuestions[col - 2]?.question.correctOption;
          const chosen = rowData[col - 1];
          if (chosen && correct) {
            if (chosen === correct) {
              c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
              c.font = { color: { argb: 'FF065F46' } };
            } else {
              c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
              c.font = { color: { argb: 'FF991B1B' } };
            }
          }
        }
      });
    }

    // Sheet C: Item Metadata (giữ nguyên)
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

    // Sheet D đã bị xóa theo yêu cầu

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
