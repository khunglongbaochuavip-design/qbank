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

1. Sinh viên làm bài kiểm tra (`student`)
2. Giáo viên soạn và nộp câu hỏi (`teacher`)
3. Trưởng bộ môn kiểm duyệt câu hỏi và tạo phòng thi (`exam_creator`)
4. Quản lý học thuật quản trị người dùng (`academic_admin`)
5. Quản trị hệ thống IT (`super_admin`)
