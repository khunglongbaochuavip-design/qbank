import { requireMinRole, badRequest } from '@/lib/api-utils';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

/**
 * GET /api/users/import/template
 * Trả về file Excel mẫu để nhập học sinh hàng loạt
 */
export async function GET(request: Request) {
  try {
    const user = await requireMinRole(request, 'admin');
    if (user instanceof NextResponse) return user;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Danh sách học sinh');

    ws.columns = [
      { header: 'STT', width: 6 },
      { header: 'Họ và tên (*)', width: 30 },
      { header: 'Email (*)', width: 35 },
      { header: 'Mật khẩu (*)', width: 20 },
      { header: 'Mã học sinh', width: 18 },
      { header: 'Lớp/Nhóm', width: 18 },
    ];

    // Style header row
    ws.getRow(1).eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    ws.getRow(1).height = 24;

    // Example rows
    const examples = [
      [1, 'Nguyễn Văn An', 'an.nv@truong.edu.vn', 'matkhau123', 'HS001', '10A1'],
      [2, 'Trần Thị Bình', 'binh.tt@truong.edu.vn', 'matkhau456', 'HS002', '10A1'],
      [3, 'Lê Văn Cường', 'cuong.lv@truong.edu.vn', 'matkhau789', 'HS003', '10A2'],
    ];
    examples.forEach(row => {
      const r = ws.addRow(row);
      r.eachCell(c => { c.alignment = { vertical: 'middle' }; });
    });

    // Style example rows with light background
    [2, 3, 4].forEach(rowNum => {
      ws.getRow(rowNum).eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNum % 2 === 0 ? 'FFDBEAFE' : 'FFEFF6FF' } };
      });
    });

    // Guide sheet
    const wsGuide = wb.addWorksheet('Hướng dẫn');
    wsGuide.getColumn(1).width = 80;
    const guideLines = [
      'HƯỚNG DẪN NHẬP HỌC SINH HÀNG LOẠT',
      '',
      'Các cột bắt buộc (đánh dấu *):',
      '  - Họ và tên (*): Họ tên đầy đủ của học sinh',
      '  - Email (*): Email đăng nhập, phải là duy nhất trong hệ thống',
      '  - Mật khẩu (*): Mật khẩu ban đầu (tối thiểu 6 ký tự)',
      '',
      'Các cột tuỳ chọn:',
      '  - Mã học sinh: Mã định danh học sinh (VD: HS001)',
      '  - Lớp/Nhóm: Tên lớp hoặc nhóm (VD: 10A1, Nhóm 2)',
      '',
      'Lưu ý:',
      '  - Không xóa hoặc đổi tên các cột tiêu đề',
      '  - Không điền dữ liệu ở hàng tiêu đề (hàng 1)',
      '  - Các dòng có email trùng sẽ bị bỏ qua và báo lỗi',
      '  - Tối đa 500 học sinh mỗi lần import',
    ];
    guideLines.forEach((line, i) => {
      const row = wsGuide.addRow([line]);
      if (i === 0) row.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
      if (line.startsWith('Các cột') || line.startsWith('Lưu ý')) row.getCell(1).font = { bold: true };
    });

    const buffer = await wb.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="mau_nhap_hoc_sinh.xlsx"',
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 });
  }
}
