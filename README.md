# QBank — Ngân hàng Câu hỏi & Thi Trực tuyến

<p align="center">
  <strong>📚 Hệ thống quản lý ngân hàng câu hỏi và tổ chức thi trực tuyến</strong><br>
  <em>Question Bank Management & Online Examination Platform</em>
</p>

---

## ✨ Tính năng chính

| Module | Mô tả |
|---|---|
| 🔐 **Xác thực & Phân quyền** | 5 vai trò: Quản trị HT, Quản trị viên, Khảo thí, Giáo viên, Học sinh |
| 📝 **Ngân hàng Câu hỏi** | CRUD, phê duyệt, phân loại theo Môn/Lĩnh vực/Chủ đề/Mức nhận thức |
| 📊 **Ma trận Đề thi** | Xây dựng blueprint với yêu cầu về số lượng, mức nhận thức, độ khó |
| 🎲 **Tạo đề thi tự động** | Rút câu hỏi ngẫu nhiên theo ma trận, tráo đáp án mỗi thí sinh khác nhau |
| 💻 **Thi trực tuyến** | Timer, autosave, chống gian lận, snapshot bài thi |
| 📈 **Kết quả & Phân tích** | Xuất Excel 4 trang: Tổng hợp, Ma trận phản hồi, Thông tin câu hỏi, Chi tiết |
| 📥 **Nhập/Xuất Excel** | Nhập hàng loạt câu hỏi, xem trước và xác nhận |
| 🧮 **MathJax** | Hỗ trợ công thức toán LaTeX trong câu hỏi |

## 🚀 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_REPO&env=DATABASE_URL,JWT_SECRET&project-name=qbank&framework=nextjs)

> Xem hướng dẫn chi tiết tại [README_DEPLOY.md](./README_DEPLOY.md)

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **UI**: Ant Design 5
- **Auth**: JWT (httpOnly cookies)
- **Deployment**: Vercel

## 📦 Cài đặt local

```bash
# 1. Clone
git clone <repo-url>
cd qbank

# 2. Cài đặt
npm install

# 3. Cấu hình
cp .env.example .env
# Sửa DATABASE_URL và JWT_SECRET

# 4. Migrate database
npx prisma migrate dev

# 5. Seed data demo
npx prisma db seed

# 6. Chạy
npm run dev
```

Truy cập: `http://localhost:3000`

## 👥 Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị HT | superadmin@qbank.edu.vn | password123 |
| Quản trị viên | admin@qbank.edu.vn | password123 |
| Khảo thí | khao.thi@qbank.edu.vn | password123 |
| Giáo viên 1 | giaovien1@qbank.edu.vn | password123 |
| Học sinh 1 | hocsinh1@qbank.edu.vn | password123 |

## 📄 Tài liệu kỹ thuật

- [Hướng dẫn deploy](./README_DEPLOY.md)
- [Định dạng nhập Excel](./docs/excel-import-format.md)
- [Cơ chế tạo đề ngẫu nhiên](./docs/exam-randomization.md)
- [Định dạng xuất kết quả](./docs/result-export-format.md)
- [Chống gian lận](./docs/anti-cheating.md)

---

**Bản quyền © Hữu Tài Genz** · Liên hệ: Zalo 0902155906
