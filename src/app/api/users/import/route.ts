import { requireMinRole, success, badRequest, logAction, getClientIP } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';

/**
 * POST /api/users/import
 * Nhận file Excel, đọc từng dòng, tạo tài khoản học sinh hàng loạt.
 * Trả về: { created, skipped, errors }
 */
export async function POST(request: Request) {
  try {
    const user = await requireMinRole(request, 'admin');
    if (user instanceof NextResponse) return user;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return badRequest('Thiếu file Excel.');

    const arrayBuffer = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    const ws = wb.getWorksheet(1) || wb.worksheets[0];
    if (!ws) return badRequest('File Excel không hợp lệ hoặc không có sheet nào.');

    // Collect rows (skip header row 1)
    type RowData = { fullName: string; email: string; password: string; studentCode: string; className: string; rowNum: number };
    const rows: RowData[] = [];
    const parseErrors: string[] = [];

    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // skip header
      const cells = row.values as (string | null | undefined)[];
      // ExcelJS row.values is 1-indexed: [undefined, col1, col2, ...]
      const fullName = String(cells[2] || '').trim();
      const email = String(cells[3] || '').trim().toLowerCase();
      const password = String(cells[4] || '').trim();
      const studentCode = String(cells[5] || '').trim() || undefined;
      const className = String(cells[6] || '').trim() || undefined;

      if (!fullName && !email && !password) return; // blank row
      if (!fullName) { parseErrors.push(`Dòng ${rowNum}: Thiếu họ tên.`); return; }
      if (!email || !email.includes('@')) { parseErrors.push(`Dòng ${rowNum}: Email không hợp lệ.`); return; }
      if (!password || password.length < 6) { parseErrors.push(`Dòng ${rowNum}: Mật khẩu quá ngắn (tối thiểu 6 ký tự).`); return; }

      rows.push({ fullName, email, password, studentCode: studentCode || '', className: className || '', rowNum });
    });

    if (rows.length === 0 && parseErrors.length === 0) return badRequest('File không có dữ liệu học sinh.');
    if (rows.length > 500) return badRequest('Tối đa 500 học sinh mỗi lần import.');

    // Check which emails already exist
    const emails = rows.map(r => r.email);
    const existingUsers = await prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } });
    const existingEmails = new Set(existingUsers.map(u => u.email));

    // Check which studentCodes already exist
    const codes = rows.map(r => r.studentCode).filter(Boolean);
    const existingCodes = codes.length > 0
      ? await prisma.user.findMany({ where: { studentCode: { in: codes } }, select: { studentCode: true } })
      : [];
    const existingCodeSet = new Set(existingCodes.map(u => u.studentCode));

    const created: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [...parseErrors];

    // Process in batches to avoid timeout
    for (const row of rows) {
      if (existingEmails.has(row.email)) {
        skipped.push(`Dòng ${row.rowNum} (${row.email}): Email đã tồn tại.`);
        continue;
      }
      if (row.studentCode && existingCodeSet.has(row.studentCode)) {
        errors.push(`Dòng ${row.rowNum} (${row.email}): Mã học sinh "${row.studentCode}" đã tồn tại.`);
        continue;
      }

      try {
        const passwordHash = await bcrypt.hash(row.password, 10);
        await prisma.user.create({
          data: {
            fullName: row.fullName,
            email: row.email,
            passwordHash,
            role: 'student',
            isActive: true,
            studentCode: row.studentCode || null,
            className: row.className || null,
          },
        });
        created.push(row.email);
        existingEmails.add(row.email); // prevent duplicate within same file
        if (row.studentCode) existingCodeSet.add(row.studentCode);
      } catch (e) {
        errors.push(`Dòng ${row.rowNum} (${row.email}): Lỗi khi tạo tài khoản.`);
        console.error(e);
      }
    }

    await logAction({ userId: user.id, action: 'CREATE', module: 'USER', targetId: 'bulk-import', ipAddress: getClientIP(request) });

    return success({
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
      createdEmails: created,
      skippedDetails: skipped,
      errorDetails: errors,
    }, 200);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
