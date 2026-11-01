import { requireMinRole, badRequest, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Đã nộp',
  auto_submitted: 'Tự động nộp (hết giờ / kết thúc phiên)',
  expired: 'Hết giờ',
  in_progress: 'Đang làm (chưa nộp)',
  absent: 'Vắng thi',
};

/** Marker written in Sheet B for a question the student did not answer */
const OMIT_MARK = '-';

function asciiSlug(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'phien_thi';
}

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
        exam: {
          include: {
            examQuestions: {
              include: { question: { include: { subject: true, domain: true, topic: true, cognitiveLevel: true, difficultyLevel: true } } },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
        participants: { include: { student: { select: { id: true, fullName: true, email: true, studentCode: true, className: true } } } },
        attempts: {
          where: { status: { in: ['submitted', 'auto_submitted', 'expired'] } },
          include: {
            student: { select: { id: true, fullName: true, email: true, studentCode: true, className: true } },
            answers: true,
            questions: { select: { questionId: true, snapshotContent: true } },
          },
          orderBy: { score: 'desc' },
        },
      },
    });

    if (!session) return badRequest('Không tìm thấy phiên thi.');

    const wb = new ExcelJS.Workbook();
    const examQuestions = session.exam.examQuestions;

    // ── Answer key FROZEN AT EXAM TIME (snapshot), not the current bank value ──
    // Grading used the snapshot, so the key in the export must use it too.
    const snapshotKey = new Map<string, string>();
    for (const att of session.attempts) {
      for (const aq of att.questions) {
        if (snapshotKey.has(aq.questionId)) continue;
        try {
          const snap = JSON.parse(aq.snapshotContent) as { correctOption?: string };
          if (snap.correctOption) snapshotKey.set(aq.questionId, snap.correctOption);
        } catch { /* ignore malformed snapshot */ }
      }
    }
    const keyOf = (questionId: string, fallback: string) => snapshotKey.get(questionId) ?? fallback;

    type Stu = { id: string; fullName: string; email: string; studentCode?: string | null; className?: string | null };

    // Sheet A: Student Summary (incl. assigned students who did not submit)
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
      { header: 'Trạng thái', width: 34 },
      { header: 'Thời gian nộp', width: 20 },
    ];
    wsA.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; });

    let stt = 0;
    session.attempts.forEach((att) => {
      const s = att.student as Stu;
      wsA.addRow([++stt, s.studentCode || s.id.substring(0, 8), s.fullName, s.className || '—', s.email, att.score, att.numCorrect, att.numWrong, STATUS_LABELS[att.status] || att.status, att.submittedAt?.toLocaleString('vi-VN')]);
    });

    // Assigned but no submitted attempt → "Vắng thi"
    const submittedIds = new Set(session.attempts.map(a => a.studentId));
    const absent = session.participants.filter(p => !submittedIds.has(p.studentId));
    if (absent.length > 0) {
      const inProgress = await prisma.examAttempt.findMany({
        where: { sessionId, status: 'in_progress' }, select: { studentId: true },
      });
      const inProgressIds = new Set(inProgress.map(a => a.studentId));
      absent
        .sort((a, b) => a.student.fullName.localeCompare(b.student.fullName, 'vi'))
        .forEach(p => {
          const s = p.student as Stu;
          const st = inProgressIds.has(s.id) ? 'in_progress' : 'absent';
          const r = wsA.addRow([++stt, s.studentCode || s.id.substring(0, 8), s.fullName, s.className || '—', s.email, null, null, null, STATUS_LABELS[st], null]);
          r.eachCell(c => { c.font = { color: { argb: 'FF9CA3AF' }, italic: true }; });
        });
    }

    // Sheet B: Item Response Matrix (chuẩn phân tích tâm trắc)
    // Hàng 1: A1="Họ và tên", B1..=mã câu hỏi
    // Hàng 2: A2="Đáp án", B2..=đáp án gốc đúng của từng câu (theo snapshot lúc thi)
    // Hàng 3+: tên thí sinh + lựa chọn đã quy về đáp án gốc; câu bỏ trống ghi "-"
    // (Chỉ gồm thí sinh đã nộp bài; thí sinh vắng được liệt kê ở Sheet A)
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

    // Row 2: correct answer key (snapshot)
    const row2Values = ['Đáp án', ...examQuestions.map(eq => keyOf(eq.questionId, eq.question.correctOption))];
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
      const s = att.student as Stu;
      const label = s.studentCode ? `${s.studentCode} — ${s.fullName}` : s.fullName;
      const rowData: string[] = [label];
      const correctness: (boolean | null)[] = [];
      for (const eq of examQuestions) {
        const ans = att.answers.find(a => a.questionId === eq.questionId);
        if (ans?.originalOption) {
          rowData.push(ans.originalOption);
          correctness.push(ans.isCorrect); // exactly what was used for the score
        } else {
          rowData.push(OMIT_MARK);
          correctness.push(null);
        }
      }
      const r = wsB.addRow(rowData);
      r.eachCell((c, col) => {
        if (col > 1) {
          c.alignment = { horizontal: 'center' };
          const ok = correctness[col - 2];
          if (ok === true) {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
            c.font = { color: { argb: 'FF065F46' } };
          } else if (ok === false) {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            c.font = { color: { argb: 'FF991B1B' } };
          } else {
            c.font = { color: { argb: 'FF9CA3AF' } };
          }
        }
      });
    }

    // Sheet C: Item Metadata
    const wsC = wb.addWorksheet('C. Thông tin câu hỏi');
    wsC.columns = [
      { header: 'Câu', width: 8 },
      { header: 'Mã câu hỏi', width: 25 },
      { header: 'Môn', width: 15 },
      { header: 'Lĩnh vực', width: 22 },
      { header: 'Chủ đề', width: 22 },
      { header: 'Mức nhận thức', width: 16 },
      { header: 'Mức độ khó', width: 14 },
      { header: 'Độ khó ước lượng', width: 16 },
      { header: 'Đáp án gốc', width: 12 },
    ];
    wsC.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } }; });

    examQuestions.forEach((eq, i) => {
      const q = eq.question;
      wsC.addRow([
        i + 1, q.questionCode, q.subject?.name || '', q.domain?.name || '', q.topic?.name || '',
        q.cognitiveLevel?.name || '', q.difficultyLevel?.name || '', q.estimatedDifficulty,
        keyOf(eq.questionId, q.correctOption),
      ]);
    });

    // Sheet D đã bị xóa theo yêu cầu

    const buffer = await wb.xlsx.writeBuffer();
    await logAction({ userId: user.id, action: 'EXPORT_RESULTS', module: 'RESULT', details: { sessionId }, ipAddress: getClientIP(request) });

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `KetQua_${asciiSlug(session.name)}_${date}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
