# Hướng Dẫn Cài Đặt Chi Tiết (Installation Guide)

Tài liệu này cung cấp các lệnh Terminal/Command Prompt chính xác để một lập trình viên có thể dựng môi trường phát triển (Local) và chạy ứng dụng QBank từ con số 0.

---

## 🕒 Bước 1: Yêu cầu Hệ Thống
- Đảm bảo máy tính của bạn đã được cài đặt **Node.js** (Phiên bản 18+ được khuyến nghị).
- Đảm bảo **Git** đã được cài đặt.

---

## 📦 Bước 2: Khởi tạo Package & Cài đặt Thư viện
QBank sử dụng kiến trúc phân tách Frontend/Backend nhưng được đặt chung trong một kho lưu trữ (Monorepo). Bạn có thể tự động cài đặt tất cả các thư viện phụ thuộc bằng lệnh duy nhất tại thư mục gốc:

```bash
# Đứng tại thư mục gốc của dự án (thư mục chứa thư mục frontend và backend)
npm run install:all

# - Lệnh trên sẽ tự động đi vào thư mục backend và chạy npm install
# - Sau đó, nó tự động đi vào thư mục frontend và chạy npm install
```

---

## ⚙️ Bước 3: Thiết lập Biến Môi trường (Environment Variables)

Hệ thống không chia sẻ trực tiếp các key bảo mật lên Git. Bạn cần tự thiết lập dựa trên File mẫu.

**Tại thư mục `backend/`:**
1. Copy file `backend/.env.example` và đổi tên thành `backend/.env`.
2. Mở file `.env` vừa tạo và chỉnh sửa (nếu cần):
   - Thay đổi chuỗi `JWT_SECRET` thành mật khẩu bảo mật của riêng bạn.
   - Giữ nguyên `DATABASE_URL="file:./dev.db"` để sử dụng SQLite cho mục đích Dev.

**Tại thư mục `frontend/`:**
- Copy file `frontend/.env.example` và tạo file `frontend/.env` (tùy chọn trong môi trường Dev, do server chạy bằng Vite).

---

## 🗄 Bước 4: Khởi tạo Cơ sở dữ liệu và Dữ liệu Mẫu (Database & Seeding)

Hệ thống sử dụng Prisma ORM và CSDL SQLite cục bộ (Có thể đổi sang PostgreSQL trong .env). Để hệ thống hoạt động, bạn phải tạo bảng và nạp dữ liệu.

Chỉ cần chạy lệnh sau tại thư mục gốc:

```bash
npm run db:push

# Lệnh trên sẽ tự động:
# 1. Chạy 'npx prisma migrate dev' để xây dựng cấu trúc DB.
# 2. Chạy 'node prisma/seed.js' để nạp sẵn danh sách Môn học, Admin, Giáo viên...
```

Sau khi chạy xong, file `backend/prisma/dev.db` sẽ xuất hiện chứa toàn bộ dữ liệu mẫu!

---

## 🚀 Bước 5: Khởi động Ứng Dụng (Chạy Local)

Khởi động cùng lúc cả Frontend và Backend bằng công cụ `concurrently` có sẵn:

```bash
# Đứng tại thư mục gốc
npm run dev
```

Cửa sổ Terminal của bạn sẽ khởi động song song 2 dịch vụ:
- **Backend API:** Sẽ chạy tại `http://localhost:3001`
- **Frontend App:** Sẽ mở giao diện tại `http://localhost:5173`

👉 **Truy cập Giao diện bằng trình duyệt của bạn vào link:** `http://localhost:5173`

*(Xem thông tin về các tài khoản Demo Test trong file `README.md`)*

---

## 🚢 Cấu trúc Lệnh Khác (Nâng cao)

- `npm run dev:backend` : Chỉ khởi chạy API backend độc lập qua nodemon.
- `npm run dev:frontend` : Chỉ khởi chạy React UI độc lập.
- `npm run build:all` : Đóng gói Frontend bằng lệnh Vite Builder để chuẩn bị upload lên Nginx host.
