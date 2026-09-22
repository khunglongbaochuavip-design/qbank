# 📚 QBank — Hướng dẫn Sử dụng Source Code

> **Phiên bản:** 3.0.0 · **Commit cuối:** `5af67c0` · **Cập nhật:** 22/09/2026

---

## 🗂️ Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Yêu cầu cài đặt](#2-yêu-cầu-cài-đặt)
3. [Khởi động nhanh (chạy local)](#3-khởi-động-nhanh-chạy-local)
4. [Cấu hình môi trường (.env)](#4-cấu-hình-môi-trường-env)
5. [Triển khai lên Vercel + GitHub](#5-triển-khai-lên-vercel--github)
6. [Cấu trúc thư mục](#6-cấu-trúc-thư-mục)
7. [Tài khoản & Phân quyền](#7-tài-khoản--phân-quyền)
8. [Hướng dẫn sử dụng các chức năng chính](#8-hướng-dẫn-sử-dụng-các-chức-năng-chính)
9. [Câu hỏi thường gặp (FAQ)](#9-câu-hỏi-thường-gặp-faq)

---

## 1. Tổng quan hệ thống

**QBank** là phần mềm quản lý ngân hàng câu hỏi và tổ chức thi trực tuyến, được xây dựng bằng:

| Thành phần | Công nghệ |
|-----------|----------|
| Frontend + Backend | Next.js 16 (App Router, Server Actions) |
| Cơ sở dữ liệu | PostgreSQL (Neon DB — serverless) |
| ORM | Prisma v7 |
| UI | Ant Design 5 |
| Deploy | Vercel |
| Auth | JWT (lưu trong localStorage) |

**URL Production:** https://qbank-mocha.vercel.app  
**GitHub:** https://github.com/khunglongbaochuavip-design/qbank

---

## 2. Yêu cầu cài đặt

| Phần mềm | Phiên bản tối thiểu | Tải về |
|---------|-------------------|--------|
| Node.js | 18+ (khuyến nghị 20+) | https://nodejs.org |
| Git | Bất kỳ | https://git-scm.com |
| npm | 9+ (đi kèm Node.js) | — |

---

## 3. Khởi động nhanh (chạy local)

### Bước 1 — Lấy source code

**Cách A: Clone từ GitHub (khuyến nghị)**
```bash
git clone https://github.com/khunglongbaochuavip-design/qbank.git
cd qbank
```

**Cách B: Giải nén từ file zip**
```bash
# Giải nén qbank_source.zip vào thư mục qbank/
cd qbank
```

### Bước 2 — Cài đặt thư viện

```bash
npm install
```

> ⏳ Lần đầu mất 2-3 phút, tải về khoảng 900MB thư viện vào `node_modules/`

### Bước 3 — Tạo file `.env`

Tạo file `.env` ở thư mục gốc (xem [Mục 4](#4-cấu-hình-môi-trường-env) để điền đúng giá trị):

```bash
cp .env.example .env   # nếu có file mẫu
# hoặc tạo mới và điền nội dung theo Mục 4
```

### Bước 4 — Khởi tạo database

```bash
npx prisma db push
```

### Bước 5 — Chạy ứng dụng

```bash
npm run dev
```

Mở trình duyệt tại: **http://localhost:3000**

---

## 4. Cấu hình môi trường (.env)

Tạo file `.env` ở thư mục gốc với nội dung sau:

```env
# === DATABASE ===
# Lấy từ https://neon.tech (miễn phí)
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# === JWT ===
# Chuỗi bí mật bất kỳ, dài ít nhất 32 ký tự
JWT_SECRET="your-super-secret-key-change-this-in-production"

# === (Tuỳ chọn) Cấu hình Next.js ===
NEXTAUTH_URL="http://localhost:3000"
```

> ⚠️ **QUAN TRỌNG:** Không bao giờ commit file `.env` lên GitHub! File này đã được thêm vào `.gitignore`.

### Lấy DATABASE_URL từ Neon

1. Đăng ký tại https://neon.tech (miễn phí)
2. Tạo project mới → Copy **Connection string**
3. Dán vào `DATABASE_URL` trong file `.env`

---

## 5. Triển khai lên Vercel + GitHub

### Push code lên GitHub

```powershell
# Windows PowerShell — cần reload PATH trước
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

git add -A
git commit -m "feat: mô tả thay đổi"
git push https://TOKEN@github.com/khunglongbaochuavip-design/qbank.git HEAD:main
```

> Thay `TOKEN` bằng GitHub Personal Access Token của bạn

### Deploy lên Vercel

```powershell
# 1. Link project (chỉ cần làm 1 lần hoặc khi token hết hạn)
npx vercel link --yes

# 2. Deploy production
npx vercel --prod --yes
```

> 🚀 Vercel tự động chạy `prisma db push` và `next build` khi deploy (cấu hình trong `vercel.json`)

### Biến môi trường trên Vercel

Vào **Vercel Dashboard → Project → Settings → Environment Variables** và thêm:
- `DATABASE_URL` — Connection string Neon DB
- `JWT_SECRET` — Chuỗi bí mật

---

## 6. Cấu trúc thư mục

```
qbank/
├── prisma/
│   └── schema.prisma          # Định nghĩa database schema
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Các trang dashboard (câu hỏi, đề thi, thí sinh...)
│   │   ├── api/               # API Routes (REST endpoints)
│   │   ├── take-exam/         # Trang làm bài thi của thí sinh
│   │   └── ...
│   ├── components/            # React components dùng chung
│   │   ├── MathEditor.tsx     # Soạn thảo công thức toán
│   │   ├── MathRenderer.tsx   # Hiển thị công thức toán
│   │   └── providers/         # Context providers (Auth...)
│   └── lib/
│       ├── api-client.ts      # Client gọi API
│       ├── api-utils.ts       # Helpers phía server (auth, response...)
│       ├── auth.ts            # JWT utilities
│       ├── constants.ts       # Hằng số (role labels, colors...)
│       └── prisma.ts          # Prisma client singleton
├── public/                    # Assets tĩnh
├── .env                       # ⚠️ File bí mật — KHÔNG commit
├── vercel.json                # Cấu hình build Vercel
├── package.json
└── HUONG_DAN.md               # File này
```

---

## 7. Tài khoản & Phân quyền

| Vai trò | Quyền hạn |
|---------|----------|
| `super_admin` | Toàn quyền hệ thống |
| `admin` | Quản lý người dùng, phê duyệt câu hỏi, tổ chức thi |
| `exam_officer` | Tạo đề thi, ca thi, xem kết quả |
| `teacher` | Soạn câu hỏi (môn được phân công) |
| `student` | Đăng nhập, làm bài thi, xem kết quả |

### Tạo tài khoản Super Admin lần đầu

Chạy script trực tiếp trên database (Neon console hoặc psql):

```sql
INSERT INTO users (id, email, "passwordHash", "fullName", role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@truong.edu.vn',
  '$2a$10$...', -- dùng bcrypt hash cho mật khẩu
  'Quản trị viên',
  'super_admin',
  true,
  NOW(), NOW()
);
```

> Hoặc dùng Prisma Studio: `npx prisma studio` → thêm user trực tiếp qua giao diện

---

## 8. Hướng dẫn sử dụng các chức năng chính

### 📝 Ngân hàng Câu hỏi

1. **Tạo câu hỏi:** Vào *Ngân hàng câu hỏi* → **Tạo câu hỏi**
   - Chọn Môn học → Lĩnh vực → Chủ đề
   - Nhập nội dung (hỗ trợ LaTeX: `$x^2$`)
   - Thêm ảnh minh hoạ (JPG/PNG, tối đa 2MB)
   - Chọn đáp án đúng và nhập giải thích
2. **Gửi phê duyệt:** Nhấn **Gửi** ở cột thao tác
3. **Phê duyệt:** Vào *Hàng chờ phê duyệt* → Xem câu hỏi → Duyệt/Từ chối

### 📥 Import/Export Câu hỏi (Excel)

1. Vào *Import/Export* → **Tải file mẫu**
2. Điền câu hỏi vào file Excel theo hướng dẫn trong sheet "Hướng dẫn"
3. Upload file → Preview → Xác nhận import

### 👥 Quản lý Học sinh Hàng loạt

1. Vào *Quản lý Người dùng* → **Tải file mẫu Excel**
2. Điền: Họ tên, Email, Mật khẩu, Mã học sinh, Lớp/Nhóm
3. Nhấn **Import học sinh từ Excel** → Chọn file → Xem kết quả

### 📋 Tổ chức Thi

| Bước | Thao tác |
|------|---------|
| 1 | *Cấu trúc* → Tạo **Ma trận** đặc tả số câu theo môn/độ khó |
| 2 | *Đề thi* → Tạo **Đề thi** từ ma trận (hệ thống chọn câu tự động) |
| 3 | *Ca thi* → Tạo **Ca thi** → Thêm thí sinh hoặc bật **Cho phép vào bằng mã** |
| 4 | Thí sinh vào https://qbank-mocha.vercel.app → Đăng nhập → Nhập mã ca thi → Làm bài |
| 5 | Kết thúc ca thi → **Xuất kết quả Excel** (3 sheet phân tích) |

### 📊 Xuất Kết quả Thi (Excel)

File xuất có **3 sheet:**
- **A. Tổng hợp** — Điểm, số câu đúng/sai, mã học sinh, lớp
- **B. Ma trận phản hồi** — Hàng 1: mã câu hỏi · Hàng 2: đáp án đúng (xanh) · Hàng 3+: lựa chọn từng thí sinh (xanh=đúng, đỏ=sai), đã quy về đáp án gốc trước khi đảo
- **C. Thông tin câu hỏi** — Mã, môn, chủ đề, độ khó, đáp án gốc

---

## 9. Câu hỏi thường gặp (FAQ)

**Q: Quên mật khẩu thì làm sao?**  
A: Admin vào *Quản lý Người dùng* → Sửa tài khoản → Đặt mật khẩu mới.

**Q: Thí sinh báo "Không tìm thấy ca thi"?**  
A: Kiểm tra ca thi đã ở trạng thái **Đang diễn ra** chưa. Vào *Ca thi* → Bắt đầu ca thi.

**Q: Import Excel bị lỗi "Email đã tồn tại"?**  
A: Email đó đã có trong hệ thống. Dùng email khác hoặc đặt lại mật khẩu cho tài khoản cũ.

**Q: Ảnh câu hỏi không hiển thị?**  
A: Ảnh được lưu dạng base64. Kiểm tra kích thước ảnh < 2MB và định dạng JPG/PNG/GIF.

**Q: Muốn sao lưu dữ liệu?**  
A: Vào Neon Dashboard → Branch → Export → tải file SQL dump.

**Q: Lỗi "prisma generate" khi deploy?**  
A: Chạy `npx prisma generate` trước khi deploy. `vercel.json` đã cấu hình tự động chạy khi build.

**Q: Token GitHub hết hạn, push bị lỗi 401?**  
A: Tạo token mới tại GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens.

---

*© 2026 QBank — Hệ thống Quản lý Ngân hàng Câu hỏi và Tổ chức Thi trực tuyến*
