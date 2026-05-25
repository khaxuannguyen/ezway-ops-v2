# EZWAY Ops v2 — Project Roadmap

> **NGUỒN SỰ THẬT DUY NHẤT về tiến độ.** Mỗi phiên làm việc: đọc file này trước.
> Cập nhật cuối: 2026-05-24 (Dọn nợ kỹ thuật: URL role harden 6 module + cancel
> order auto hoàn kho + sync snapshot cước khi sửa pickup đã gắn đơn. Pickup
> status history vừa làm; Payment Phase 1 đã có; Sepay Phase 2 đợi TK bank;
> Accounting + Tracking đã có plan, chưa code).
> (Các file `plans/*.md` đã LỖI THỜI — bỏ qua, không phản ánh thực tế.)

## Khởi động mỗi ngày
1. Mở **Docker Desktop** → đợi container `ezway-postgres` tự lên (port 5433).
2. `npm run dev`
3. Nếu vừa đổi schema lần trước → restart dev server để nạp Prisma client mới.
4. Đăng nhập tại `/login`: nút "Đăng nhập với Google" (đã cấu hình OAuth) hoặc
   email + mật khẩu. Tài khoản admin xem ở `/admin/users`; đổi mật khẩu ở `/admin/profile`.
   Reset mật khẩu bất kỳ qua CLI: `npx tsx prisma/set-password.ts <email> <mật khẩu>`.

## ✅ Đã hoàn thành (CRUD đầy đủ, lint + build pass)

| Module | Route | Ghi chú |
|---|---|---|
| Dashboard | `/admin/dashboard` | Số liệu Prisma thật |
| Khách hàng | `/admin/customers` | |
| Đơn hàng | `/admin/orders` | Nhập mã lệnh lấy hàng → tự tính cước; chi phí phát sinh, vật tư |
| Dịch vụ | `/admin/services` | |
| Khoản chi phí | `/admin/cost-items` | |
| Bảng giá chi phí | `/admin/cost-rates` | Scale cân cố định, import CSV/paste, sửa-tất-cả |
| Tài xế | `/admin/drivers` | Tạo User role DRIVER kèm theo |
| Lệnh lấy hàng | `/admin/pickups` | Tạo trước (mã `PK-...`), nhập kiện hàng; gán tài xế + đổi trạng thái; **log đầy đủ lịch sử trạng thái** (PickupStatusLog) + timeline UI + ghi chú khi đổi |
| Kho vật tư | `/admin/supplies` | Nhập/Xuất/Kiểm kê + lịch sử |
| Chi phí thành lập | `/admin/startup-expenses` | Tổng hợp + tự gợi ý nhóm theo từ khóa |
| Tài khoản | `/admin/users` | CRUD tài khoản, gán role, đặt/reset mật khẩu (chỉ ADMIN) |
| Thống kê sale | `/admin/sales` | Báo giá + đã thu + công nợ + lợi nhuận theo sale, lọc tháng (chỉ ADMIN) |
| Bán hàng của tôi | `/admin/my-sales` | Dashboard cá nhân SALE + BXH doanh thu (ẩn lợi nhuận người khác) |
| Tài khoản của tôi | `/admin/profile` | Tự sửa hồ sơ nhân sự + đổi mật khẩu (mọi role) |
| Thanh toán | Tab trong `/admin/orders/[id]` | Ghi nhận thu/hoàn (CASH/CK/COD/khác), `paidVnd` + `paymentStatus` đồng bộ trong transaction; DELIVERED + PAID auto đóng đơn (`CLOSED`). ADMIN/STAFF ghi; SALE chỉ đọc. |

**Tích hợp:** Đơn ↔ Lệnh lấy hàng · Đơn ↔ Kho (tự trừ tồn khi tạo đơn)

**Auth:** đăng nhập **Google OAuth** (arctic, invite-only) + email/mật khẩu băm (bcryptjs)
làm fallback; session JWT-trong-cookie (jose). `proxy.ts` chặn `/admin/*`; layout admin
`requireUser()`; nav ẩn mục theo role. `lib/auth` có `getCurrentUser / requireUser / requireRole`.
Roles: `ADMIN, STAFF, SALE, DRIVER`.

**Google login:** invite-only — admin tạo tài khoản (email Gmail + role) ở `/admin/users`,
mật khẩu bỏ trống; nhân viên bấm "Đăng nhập với Google". Gmail chưa được mời → từ chối.
Cần `GOOGLE_CLIENT_ID/SECRET` trong `.env` (xem `docs/profile-google-auth-plan.md`); để
trống thì nút Google ẩn, app vẫn chạy.

**Hồ sơ nhân viên:** model `EmployeeProfile` (1-1 User) — SĐT, địa chỉ, chức vụ, ngày
sinh/vào làm, liên hệ khẩn, CCCD. Nhân viên tự điền ở `/admin/profile`; admin xem ở
trang chi tiết tài khoản. Upload giấy tờ: HOÃN (chưa có hạ tầng lưu file).

**Sales Portal:** `Order.salesUserId` (FK User role SALE). Form đơn có ô chọn sale —
người tạo là SALE thì tự gán chính họ. SALE chỉ thấy/sửa đơn của mình; đăng nhập vào
thẳng `/admin/my-sales`. BXH xếp theo doanh thu tháng. Thống kê admin xem ở `/admin/sales`.

**Luồng Lệnh lấy hàng → Đơn (pickup-first):** Lệnh lấy hàng tạo TRƯỚC, độc lập, có mã
`PK-...`; **kiện hàng (cân + kích thước) thuộc Lệnh lấy hàng**. Tạo Đơn → nhập mã `PK-...`
→ hệ thống lấy kiện từ lệnh, tính cân quy đổi theo hệ số dịch vụ → ra cước tự động.
Pickup lưu kích thước thô; cân quy đổi tính lúc tạo Đơn (khi biết dịch vụ). 1 pickup = 1 đơn.
Module `/admin/packages` đứng riêng đã GỠ BỎ — kiện hàng quản lý trong Lệnh lấy hàng.

**Dữ liệu riêng tư theo SALE (chống trộn / chống đá khách):**
- **Lệnh lấy hàng:** SALE chỉ thấy + sửa lệnh **do chính mình tạo**
  (`PickupRequest.createdById`). SALE tạo Đơn chỉ dùng được mã pickup của mình
  (server chặn). ADMIN/STAFF thấy tất cả; vẫn độc quyền gán tài xế + đổi trạng thái.
- **Khách hàng:** `Customer.salesUserId` (sale phụ trách). SALE chỉ thấy/sửa khách
  của mình. Form đơn — ô chọn khách lọc theo sale. **Chặn trùng SĐT** ở action
  (chống đá khách qua bản ghi trùng). **ADMIN gỡ khoá** bằng cách sửa `salesUserId`
  của khách → chuyển sang sale khác (vd sale nghỉ).

**Payment / Công nợ (Phase 1):** `Payment.recordedById` (ADMIN/STAFF ghi nhận;
SALE chỉ đọc). `Order.paidVnd` + `Order.paymentStatus` denormalized, sync trong
`prisma.$transaction` mỗi lần create/update/delete payment. PaymentMethod enum:
CASH | BANK_TRANSFER | COD | OTHER. Hoàn tiền = `amountVnd` âm. Khi
`paymentStatus = PAID` + `status = DELIVERED` → auto-flip `status = CLOSED`
(1 chiều, xoá payment KHÔNG revert). Sales Portal tách **Báo giá** vs **Đã thu**
vs **Công nợ**. Dashboard widget công nợ hiện tại. Customer detail có card công nợ.
Plan chi tiết: `docs/payment-ar-phase1-plan.md`.

**Migrations đã chạy:** `init_domain`, `add_warehouse`, `link_stock_to_order`, `add_startup_expenses`, `expense_categories_v2`, `add_sale_role_and_password`, `add_order_sales_user`, `add_google_auth_employee_profile`, `pickup_first`, `pickup_created_by`, `customer_sales_owner`, `add_payment_ar`, `stock_refund_marker`

**Phân quyền URL (cứng theo role, không chỉ ẩn menu):**
- ADMIN-only: `/admin/sales`, `/admin/users`, `/admin/services`, `/admin/cost-items`,
  `/admin/cost-rates`, `/admin/startup-expenses`
- ADMIN/STAFF: `/admin/drivers`, `/admin/supplies` (+ Payment actions)
- Defense-in-depth: cả layout (chặn URL) lẫn server action (chặn POST trực tiếp).

## ⬜ Chưa làm / để sau

- [ ] **Driver portal** `/driver/*` — VIỆC TIẾP THEO.
- [ ] Test tự động (Playwright / Vitest) — chưa setup.
- [ ] Ảnh lệnh lấy hàng (PickupPhoto) — chưa làm. Lịch sử trạng thái đã làm xong.
- [ ] Báo cáo tiêu hao vật tư theo kỳ (tháng/quý).
- [ ] Sales: target/KPI theo sale (tuỳ chọn về sau).
- [ ] **Payment Phase 2:** tích hợp Sepay/ngân hàng webhook auto-reconcile, 1
      payment cho nhiều đơn (B2B), in phiếu thu PDF, aging report (đơn quá hạn),
      hoa hồng tự động trên tiền đã thu, refund flow riêng.

## ⚠️ Nợ kỹ thuật / lưu ý
- **Git:** đã commit + push lên GitHub (`github.com/khaxuannguyen/ezway-ops-v2`, nhánh `master`). Cuối mỗi phiên nhớ commit + push.
- Đổi schema → BẮT BUỘC restart `npm run dev`.
- ESLint còn 1 warning ở `data-table.tsx` (giới hạn thư viện TanStack — không phải lỗi).
- Mã chi phí thành lập là `CP-xxxx` (Google Sheet dùng `CAPEX-xxx`).
- `.env` (không commit) cần `SESSION_SECRET` (>=16 ký tự) để ký session — đã có sẵn.
- `.env` có ô `GOOGLE_CLIENT_ID/SECRET` (đang trống) — điền để bật đăng nhập Google.
- Không làm "quên mật khẩu" qua email: dùng Google login (không mật khẩu) hoặc admin
  reset hộ. Đây là quyết định có chủ đích (xem `docs/profile-google-auth-plan.md`).
- **Lỗ hổng kinh doanh:** chưa có UI ghi nhận Thanh toán/công nợ (model `Payment` có
  sẵn). Doanh thu Sales Portal đang là tiền BÁO GIÁ, chưa phải tiền THỰC THU.

## Quy ước làm việc
- Mỗi cuối phiên: cập nhật file này (đánh dấu ✅ việc xong, thêm việc mới).
- Mỗi đầu phiên: đọc file này → biết làm gì tiếp.
