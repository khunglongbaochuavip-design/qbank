# Hướng dẫn Deploy QBank lên Vercel

## Yêu cầu

1. **Tài khoản Vercel** (miễn phí): https://vercel.com
2. **Database PostgreSQL** (chọn 1):
   - Neon (khuyên dùng, miễn phí): https://neon.tech
   - Supabase: https://supabase.com
   - Vercel Postgres

## Bước 1: Tạo Database

### Neon (khuyên dùng)
1. Đăng ký tại https://neon.tech
2. Tạo project mới
3. Copy Connection String (dạng `postgresql://user:pass@host/db?sslmode=require`)

## Bước 2: Deploy

### Cách 1: Nút Deploy (nhanh nhất)
1. Nhấn nút **Deploy with Vercel** trong README.md
2. Nhập các biến môi trường:
   - `DATABASE_URL`: Connection string từ Bước 1
   - `JWT_SECRET`: Chuỗi bí mật (tối thiểu 32 ký tự)
3. Nhấn Deploy

### Cách 2: Import từ GitHub
1. Push code lên GitHub
2. Vào https://vercel.com/new → Import repository
3. Cấu hình Environment Variables
4. Deploy

## Bước 3: Migrate Database

Sau khi deploy, chạy trong terminal:
```bash
npx prisma migrate deploy
npx prisma db seed
```

Hoặc sử dụng Vercel CLI:
```bash
npx vercel env pull .env.local
npx prisma migrate deploy
npx prisma db seed
```

## Biến môi trường

| Tên | Bắt buộc | Mô tả |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret key cho JWT (tối thiểu 32 ký tự) |
| `CLOUDINARY_CLOUD_NAME` | ❌ | Tên cloud Cloudinary (cho upload ảnh) |
| `CLOUDINARY_API_KEY` | ❌ | API key Cloudinary |
| `CLOUDINARY_API_SECRET` | ❌ | API secret Cloudinary |

## Lưu ý

- Database PostgreSQL phải hỗ trợ SSL
- Sau mỗi lần cập nhật schema, chạy `npx prisma migrate deploy`
- Free tier Neon: 0.5GB storage, 190 giờ compute/tháng (đủ cho ~100 users)
