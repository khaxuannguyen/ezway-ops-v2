# Kế hoạch Phase: Auth + Sales Portal

> Phiên sau làm theo file này. Quyết định đã chốt với chủ DN.

## Quyết định đã chốt
- Nhân viên sale = `User` với role **SALE** (không tạo bảng riêng).
- Làm **Auth trước**, rồi mới làm sales-portal.
- Roles: `ADMIN`, `STAFF`, `SALE`, `DRIVER`.

## Cách tiếp cận khuyến nghị: Session tối giản (KISS)
Tool nội bộ → không cần Better Auth full. Dùng: email + mật khẩu băm + cookie session ký.
(Better Auth là lựa chọn thay thế nếu sau cần OAuth/2FA/quên-mật-khẩu.)

## Bước thực thi (theo thứ tự — gate bật CUỐI cùng để an toàn nếu gián đoạn)

1. **Schema**: thêm `SALE` vào enum `UserRole`; thêm `User.passwordHash String?`.
   Migration. (Session dạng JWT-trong-cookie stateless → không cần bảng Session.)
2. **lib/auth**: hàm băm + verify mật khẩu (vd `bcryptjs`); tạo/đọc/verify cookie
   session; `getCurrentUser()`.
3. **Trang `/login`** + server action đăng nhập; action đăng xuất.
4. **User management** `/admin/users`: CRUD tạo tài khoản, gán role, đặt/reset
   mật khẩu. Seed: gán mật khẩu cho user admin sẵn có.
5. Thay `lib/current-user.ts` `getActorUserId()` → đọc từ session.
6. Header: hiện user hiện tại + nút đăng xuất.
7. **CUỐI**: `middleware.ts` chặn route — chưa đăng nhập vào `/admin/*` → `/login`;
   gate theo role. (Bật bước này cuối → nếu dừng giữa chừng app vẫn chạy.)

## Sau Auth: Sales Portal
- `Order` thêm `salesUserId` (FK User role SALE). Form tạo đơn: chọn nhân viên sale
  (hoặc tự gán = user đang đăng nhập nếu họ là SALE).
- Trang admin: thống kê doanh thu + lợi nhuận theo sale + BXH đầy đủ.
- Góc nhìn SALE: dashboard cá nhân (doanh thu/đơn/lợi nhuận của MÌNH);
  BXH doanh thu — xem thứ hạng, **ẩn lợi nhuận người khác**.
- Tùy chọn sau: target/KPI theo sale.

## Rủi ro
- Đừng bật middleware trước khi trang login chạy được → khoá app.
- Seed mật khẩu cho admin trước khi bật gate, kẻo tự khoá mình ra ngoài.
