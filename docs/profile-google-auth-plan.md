# Kế hoạch: Đăng nhập Google + Hồ sơ nhân viên

> Chốt qua brainstorm 2026-05-22. Phiên triển khai đọc file này.
> Ưu tiên: làm **sau go-live** (không chặn launch).

## Quyết định đã chốt

- **Hướng A — Đăng nhập Google, passwordless, invite-only.**
- Hồ sơ HR: chỉ **trường phẳng**, **hoãn** upload giấy tờ (chưa có hạ tầng lưu file).
- KHÔNG làm: trang đăng ký công khai · hàng đợi chờ duyệt · forgot-password qua email.

## Vì sao (tóm tắt brainstorm)

- Tool nội bộ 15-50 người, dùng **Gmail cá nhân** (không có domain công ty) → không
  khoá theo domain được → đăng ký công khai = cổng mở cho người lạ.
- "Đăng ký → duyệt" được **lật ngược**: admin mời trước (= duyệt + cấp role), nhân
  viên đăng nhập sau. Việc admin tạo tài khoản CHÍNH LÀ bước duyệt.
- Google login = không mật khẩu → bài toán forgot-password tự biến mất.

## Luồng hoạt động

1. Admin vào `/admin/users` → nhập **tên + email Gmail + role** (mật khẩu để trống).
2. Nhân viên mở app → **"Đăng nhập với Google"** → Google trả email đã xác thực.
3. Hệ thống khớp email với `User`:
   - Khớp + đang hoạt động → tạo session, vào `/admin`.
   - Không khớp → từ chối: "Tài khoản chưa được cấp quyền, liên hệ quản trị viên."
   - Khớp nhưng bị khoá → từ chối.
4. Lần đầu vào, nhân viên tự điền hồ sơ ở **"Tài khoản của tôi"**.
- Giữ **đăng nhập email + mật khẩu** làm fallback (tài khoản `admin@ezway.local`
  không phải Gmail). Trang `/login` hiện cả 2 cách.

## Kiến trúc kỹ thuật

- Dùng thư viện `arctic` (OAuth2 provider, có sẵn class Google + PKCE) — **giữ nguyên
  session jose hiện tại**, KHÔNG thay bằng Better Auth / Auth.js (over-kill cho 1 provider).
- OAuth cần redirect GET → dùng **route handler**, không phải server action:
  - `app/api/auth/google/route.ts` — tạo URL consent, set cookie `state` + PKCE, redirect.
  - `app/api/auth/google/callback/route.ts` — đổi code lấy profile, khớp user, set session.
- Chỉ tin email khi Google trả `email_verified = true`.
- `proxy.ts` hiện không match `/api/*` → route callback truy cập được khi chưa đăng nhập. ✓

## Thay đổi schema

`User` — thêm:
- `googleId String? @unique` — lưu khi đăng nhập Google lần đầu (khớp ban đầu bằng email).
- `image String?` — avatar từ Google (tuỳ chọn).

Model mới `EmployeeProfile` (1-1 với User, tạo lazy khi nhân viên lưu hồ sơ lần đầu):
- `userId String @unique` + quan hệ tới User
- `phone String?` · `address String?` · `position String?` (chức vụ, free text)
- `dateOfBirth DateTime?` · `joinedAt DateTime?` (ngày vào làm)
- `emergencyContactName String?` · `emergencyContactPhone String?`
- `nationalId String?` (CCCD/CMND)
- `notes String?` · `createdAt` · `updatedAt`
- `@@map("employee_profiles")`
- **KHÔNG** có trường file/giấy tờ (hoãn).

Migration: SQL thủ công (theo lệ dự án), thuần additive — an toàn.

## Trang & route

| Route | Việc |
|---|---|
| `/login` | Thêm nút "Đăng nhập với Google" (giữ form email/mật khẩu) |
| `/api/auth/google` + `/callback` | Route handler xử lý OAuth |
| `/admin/profile` | "Tài khoản của tôi": xem info, sửa tên + hồ sơ HR của chính mình; đổi mật khẩu (chỉ hiện nếu tài khoản có mật khẩu) |
| `/admin/users` | Mật khẩu khi tạo tài khoản → **tuỳ chọn** (để trống = tài khoản chỉ đăng nhập Google). Trang chi tiết: admin xem được hồ sơ HR của nhân viên |
| Header user menu | Thêm link "Tài khoản của tôi" |

## Thứ tự thực hiện (an toàn nếu gián đoạn)

1. Schema: `User.googleId`, `User.image`, model `EmployeeProfile` + migration.
2. **Chủ DN** lập Google Cloud project (xem mục dưới) → bỏ credentials vào `.env`.
3. `lib/auth`: thêm helper OAuth Google (arctic) + hàm khớp user theo email.
4. Route handler `/api/auth/google` + `/callback`.
5. `/login`: thêm nút Google.
6. `/admin/profile` + action `updateMyProfile` + query EmployeeProfile.
7. `/admin/users`: mật khẩu tuỳ chọn khi tạo; hiện hồ sơ HR ở trang chi tiết.
8. Header: link "Tài khoản của tôi".
9. Lint + build + smoke test.

## Việc của chủ DN (làm 1 lần, cần tài khoản Google)

1. console.cloud.google.com → tạo project mới.
2. **APIs & Services → OAuth consent screen** → chọn **External** → điền tên app + email hỗ trợ.
3. Để ở chế độ **Testing** → thêm 15-50 email Gmail nhân viên vào mục **Test users**
   (tối đa 100, không cần Google verify, không hiện cảnh báo chặn).
4. **Credentials → Create OAuth client ID → Web application.**
5. Authorized redirect URIs:
   - Dev: `http://localhost:3000/api/auth/google/callback`
   - Prod: thêm sau khi có domain.
6. Lấy **Client ID + Client Secret** → bỏ vào `.env` (đã gitignore):
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Rủi ro / lưu ý

- **Chưa có credentials Google → OAuth không chạy được.** Code dựng + build được, nhưng
  test luồng login Google phải đợi bước "việc của chủ DN". Bước 2 nên làm sớm.
- **Redirect URI prod** chưa biết (app chưa deploy) → bổ sung sau khi có domain.
- **Đừng xoá đăng nhập mật khẩu** — admin sẽ tự khoá mình ngoài (admin không dùng Gmail).
- Nhân viên DRIVER tạo qua module Tài xế: chưa cần Google (chưa có driver portal) — bỏ qua.
- Hồ sơ HR vẫn có 1 chỗ trùng nhẹ: `Driver.phone` đã có sẵn. Không phải lỗi, bỏ qua.

## Tiêu chí hoàn thành

- Nhân viên được mời (admin tạo account theo Gmail, không mật khẩu) đăng nhập Google OK.
- Gmail chưa được mời → bị từ chối với thông báo rõ ràng.
- Admin vẫn đăng nhập được bằng email + mật khẩu.
- Nhân viên xem + sửa được hồ sơ HR của chính mình ở `/admin/profile`.
- Không tồn tại route đăng ký công khai.
- Lint + build pass.

## Phụ thuộc

- Package `arctic` (npm).
- Credentials OAuth Google (việc của chủ DN).
- Domain prod cho redirect URI (khi deploy).

---

**Ghi chú ưu tiên:** Lỗ hổng lớn hơn vẫn là **chưa ghi nhận thanh toán / công nợ khách**
(model `Payment` có nhưng không có UI tạo) — doanh thu/lợi nhuận ở Sales Portal đang là
tiền *báo giá*, không phải tiền *thực thu*. Chủ DN đã chọn làm auth/profile trước; cân
nhắc làm module Thanh toán ngay sau đó.
