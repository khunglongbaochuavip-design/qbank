# QBank — Hệ thống Quản lý Ngân hàng Câu hỏi và Thi Trực Tuyến

QBank là giải pháp phần mềm toàn diện hỗ trợ các trường học và trung tâm giáo dục quản lý vòng đời ngân hàng câu hỏi, ma trận đề thi, và tổ chức thi trực tuyến.

Bản quyền thuộc về **Hữu Tài Genz**
Mọi thông tin liên hệ: **Zalo 0902155906**

---

## 🚀 Công nghệ sử dụng
- **Môi trường Backend:** Node.js (Express)
- **Cơ sở dữ liệu:** SQLite (có thể dễ dàng chuyển đổi sang PostgreSQL via Prisma ORM)
- **Frontend:** React (Vite) + Ant Design UI
- **Quản lý file:** Multer + ExcelJS (Nhập & Xuất Excel)

---

## 📁 Cấu trúc Thư mục (Folder Structure)

| Thư mục/File | Chức năng (Purpose) |
| :--- | :--- |
| `frontend/` | Chứa toàn bộ mã nguồn React app (Giao diện người dùng, Auth routing). |
| `backend/` | Chứa mã nguồn Node.js server (Xử lý API, xác thực token, kết nối DB). |
| `docs/` | Lưu trữ file tĩnh, bao gồm mẫu import Excel tham khảo (`docs/templates/`). |
| `INSTALL.md` | **Tài liệu hướng dẫn cài đặt** bằng dòng lệnh chi tiết. Đọc file này trước! |
| `package.json` | Script gốc (Môi trường Root) để điều phối lệnh khởi chạy đồng thời. |
| `.gitignore` | Cấu hình bỏ qua các file mật (`.env`, `dev.db`) khi code được đẩy lên Git. |

---

## 🛠 Hướng dẫn Cài đặt & Khởi chạy (Môi trường Dev)

👉 Vui lòng đọc file **[INSTALL.md](./INSTALL.md)** để xem toàn bộ hướng dẫn cấu hình môi trường, cài đặt cơ sở dữ liệu và thư viện, cũng như chạy Server Local!


Yêu cầu hệ thống: **Node.js v18+** và **Git**.

---

## 👥 Tài khoản Demo (Dữ liệu Seed)

Tất cả các tài khoản demo đều sử dụng chung mật khẩu: `password123`

| Vai trò | Email đăng nhập | Quyền hạn |
| :--- | :--- | :--- |
| **Quản trị viên** | `superadmin@qbank.edu.vn` | Toàn quyền kiểm soát hệ thống |
| **Quản lý học thuật**| `admin@qbank.edu.vn` | Phê duyệt câu hỏi, tạo mã trận, quản lý tài khoản |
| **Xây dựng đề thi** | `khao.thi@qbank.edu.vn` | Quản lý ma trận đề, sinh đề thi, mở phiên thi |
| **Giáo viên** | `giaovien1@qbank.edu.vn` | Soạn thảo câu hỏi `nháp`, import Excel |
| **Học sinh** | `hocsinh1@qbank.edu.vn` | Tham gia các phiên thi trực tuyến, xem kết quả |

---

## 📦 Hướng dẫn Đóng gói & Triển khai (Môi trường Production)

Để đóng gói phần mềm và triển khai lên môi trường thực tế (VPS/Server):

**1. Đóng gói Frontend:**
```bash
npm run build:all
```
Mã nguồn React đã được tối ưu sẽ nằm trong thư mục `frontend/dist`. Bạn có thể triển khai thư mục này bằng **Nginx** hoặc **Vercel/Netlify**.

**2. Cấu hình Backend Server:**
- Đổi tên file `backend/.env.example` thành `backend/.env`
- Sửa giá trị `CORS_ORIGIN` thành tên miền frontend của bạn (VD: `https://qbank.vn`).
- Thay đổi `JWT_SECRET` thành chuỗi mật khẩu phức tạp để bảo mật token.

**3. Chạy Backend với PM2 (hoặc Node):**
```bash
cd backend
npm install
pm2 start src/app.js --name "qbank-api"
```

---

## 📂 Kiến trúc Phân quyền (RBAC)

# QBank Release Notes - Version v1.0.0

**Release Date:** Tháng 4, 2026
**Tác giả:** Hữu Tài Genz (Zalo: 0902155906)

---

## 🌟 Tính năng Hoàn thành (Completed Features)

Đây là phiên bản thương mại/sản xuất đầu tiên, đáp ứng toàn diện chu trình Quản lý Ngân hàng Câu hỏi và Tổ chức Thi trực tuyến theo phân quyền.

*   **Xác thực Bảo mật Multi-Tier:**
    *   Hệ thống đăng nhập bằng Web Token (`JWT`) hoàn chỉnh.
    *   Phân quyền RBAC mạnh mẽ với 5 cấp bậc (`Super Admin`, `Academic Admin`, `Q-Creator/Exam Creator`, `Teacher`, `Student`).
*   **Ngân hàng Câu hỏi Cốt lõi (Question Bank):**
    *   Thêm mới, sửa, và lưu trữ (archive) câu hỏi với trình soạn thảo Rich Text & hình ảnh.
    *   Quy trình Workflow 3 bước: `Nháp` ➔ `Chờ Duyệt` ➔ `Đã Phê Duyệt`. Chỉ những câu hỏi đã duyệt mới được sử dụng.
*   **Tích hợp Excel (Nhập & Xuất):**
    *   Hỗ trợ Download File mẫu Excel động (Render trực tiếp dựa trên config của Database).
    *   Nhập (Import) hàng loạt câu hỏi thông qua thư viện `exceljs` được bọc bởi `multer`.
    *   Xuất (Export) danh sách câu hỏi ra file Excel `.xlsx` với Data chuẩn Format gốc.
*   **Động cơ Sinh đề (Exam Engine):**
    *   Quản lý thông số Ma trận tỷ lệ (Dựa trên Topic và Cognitive Levels).
    *   Thuật toán randomizer kết xuất đề thi không trùng lặp dựa vào tham số Ma trận.
*   **Module Thi Trực tuyến & Chấm điểm (Session & Attempt):**
    *   Sinh viên làm bài đếm ngược thời gian (Real-time tracking local).
    *   Tự động tính điểm ngay khi Nộp bài.
*   **Báo cáo Thống kê:**
    *   Hỗ trợ sinh viên xem lại Chi tiết từng câu (Bao gồm Giải thích đáp án).
    *   Bảng Admin theo dõi Kết quả Phiên thi.

---

## 🚧 Tính năng Đang hoành thành (Partially Completed Features)

*   **Giao diện Trắc nghiệm Hình ảnh nâng cao:** Hệ thống hiện tại có hỗ trợ đính kèm hình ảnh (`upload`), nhưng giao diện zoom-in (Gallery Viewer) lúc sinh viên làm bài thi chứa hình quá to/nhỏ vẫn cần được tối ưu CSS linh hoạt hơn.
*   **Settings System (Cài đặt cấu hình):** Trang Cấu hình Hệ thống (`/settings`) đã được móc nối vào Router frontend dành riêng cho Quản trị viên, nhưng hiện tại bên trong chưa có giao diện thay đổi Config thật sự.

---

## 🛑 Những Hạn chế Đã biết (Known Limitations)

*   **SQLite Concurrency:** Dự án hiện đang dùng **SQLite** ở backend (`dev.db`). Đối với môi trường 500+ sinh viên thi đồng loạt, SQLite sẽ gặp tình trạng "Transaction Lock".
*   **Local Storage Image Bloat:** Ảnh tải lên được lưu thẳng vào thư mục `backend/uploads/` trên ổ cứng server. Máy chủ cần có dung lượng lớn.
*   **Timer Reset:** Nếu Học sinh bấm F5 (Refresh) hoặc tắt mạng trong khi thi, bộ đếm thời gian ở phía client không được đồng bộ hóa lại với Redis/Database nên họ có thể mất tiến trình thi hoặc làm lại từ đầu.

---

## 🐛 Lỗi Hiện tại (Known Bugs)

*   **Zero Bugs P0/P1:** Tại thời điểm đóng gói phiên bản 1.0.0, **không có** bất kỳ Fatal Error hay Crash hệ thống nào đối với các chức năng chính.
*   *Lỗi nhỏ (Minor):* Nếu quản trị viên xóa một Topic ID khi đã có Sinh viên làm bài thi chứa câu hỏi Topic đó, có thể phát sinh mâu thuẫn hiển thị trong bảng Record lịch sử (Nên sử dụng chức năng Ẩn (Hide) thay vì Hard-Delete).

---

## 🔧 Yêu cầu Cài đặt (Setup Requirements)

Hệ thống được thiết kế độc lập và nhẹ (Lightweight). Để chạy Local:
1. **Node.js** phiên bản v18.0.0 trở lên.
2. File thiết lập biến môi trường `.env` có chứa `JWT_SECRET`.
3. (Tùy chọn) PM2 để chạy tiến trình ngầm cho server Backend.
4. Triển khai chuẩn yêu cầu proxy API qua Nginx ở thư mục cài đặt gốc.

*(Xem `INSTALL.md` để lấy câu lệnh chi tiết!)*

---

## 🔮 Cải tiến Tiếp theo Mục tiêu v1.1.0 (Next Improvements)

1.  **Chuyển đổi Database:** Migrate toàn bộ Schema Prisma từ **SQLite** sang **PostgreSQL** để hỗ trợ thi quy mô lớn.
2.  **Lưu trữ Đám mây (Cloud Storage):** Cấu hình AWS S3 Bucket (Storage) làm điểm đáp cho API Tải ảnh câu hỏi, chấm dứt việc phụ thuộc vào ổ cứng server.
3.  **Hệ thống Auto-Save (Lưu tạm):** Mở API Websocket hoặc LocalStorage Cache để lưu từng đáp án sinh viên chọn theo giời gian thực (cứ 15 giây/lần) giúp bảo vệ bài làm khi rớt mạng.
4.  **Cài đặt Giao diện Admin:** Bổ sung giao diện chỉnh sửa Tên Trường học / Logo Trường học trên Layout đăng nhập do `super_admin` thiết lập.


1. Sinh viên làm bài kiểm tra (`student`)
2. Giáo viên soạn và nộp câu hỏi (`teacher`)
3. Trưởng bộ môn kiểm duyệt câu hỏi và tạo phòng thi (`exam_creator`)
4. Quản lý học thuật quản trị người dùng (`academic_admin`)
5. Quản trị hệ thống IT (`super_admin`)
