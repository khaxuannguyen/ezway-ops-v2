# EZWAY Ops v2 — Project Roadmap

> **NGUỒN SỰ THẬT DUY NHẤT về tiến độ.** Mỗi phiên làm việc: đọc file này trước.
> Cập nhật cuối: 2026-05-30 (Driver portal MVP + Pending invites + Email notify
> admin + Markup cost-rates theo dải cân + ADMIN xoá đơn + Backup script + Deploy
> doc Vercel/Neon). Build pass + TS clean.
> **Tin mới (2026-05-29):** đã có STK ngân hàng công ty + chữ ký số + HDDT.
> **HDDT integration** sẵn sàng triển khai (ưu tiên #1 — mở khoá khách B2B).
> **Sepay Phase 2 bị chặn** vì Sepay Open Banking không support Techcombank
> (chỉ có 11 bank: VCB, Sacombank, TPBank, VPBank, VietinBank, ACB, BIDV, MBBank,
> OCB, KienLongBank, MSB). Tạm hoãn — nếu cần auto-reconcile sau, phương án là
> mở thêm TK ở 1 bank trong list.
> Trước đó (2026-05-26): Forwarder Processing Phase A (Copy Helper Kango/KSN/Go).
> Trước nữa: dọn nợ kỹ thuật, pickup status history, Payment Phase 1, Excel
> template payroll. Tracking + Accounting đã có plan.
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
| Đẩy carrier (Forwarder Processing Phase A) | `/admin/processing` + `/admin/orders/[id]/forward` | Queue đơn pending; Copy Helper modal với click-to-copy từng cụm field (Sender / Receiver / Order info / Packages / Invoice) — paste sang portal Kango/KSN/Go; admin nhập tracking carrier trả + đánh dấu "đã đẩy". **CCCD ở Sender (Customer VN), Recipient chỉ tên/SĐT/địa chỉ gộp.** Bill packages LUÔN hiển thị trong form (kể cả khi có pickupCode tham chiếu) |
| Thông báo nội bộ | `/admin/announcements` | List/detail/CRUD (kiểu Kango). Pinned đứng trước, badge "Mới" cho unread. ADMIN tạo/sửa/pin/xoá; mọi role xem theo `visibleToRoles[]`. `expiresAt` ẩn TB hết hạn. Sidebar có unread badge realtime (layout `force-dynamic`). `markAsRead` idempotent qua AnnouncementRead (KHÔNG revalidate trong render) |
| Driver portal MVP | `/driver` + `/driver/pickups/[id]` | Mobile-first dashboard tài xế. List lệnh assigned (nhóm Đang xử lý / Đã hoàn tất). Detail lệnh: thông tin liên hệ + nút "Bấm để gọi" (tel:) + địa chỉ + kiện hàng. Read-only (đổi trạng thái vẫn admin xử lý). Login redirect: DRIVER → /driver thay vì /admin. Proxy chặn /driver/* nếu chưa login |
| Yêu cầu cấp quyền | `/admin/pending-invites` | Google login từ email chưa được mời → app ghi LoginAttempt + gửi email cho mọi ADMIN qua Resend (rate-limit 1 email/giờ/email). ADMIN xem list pending + nút "Tạo TK ngay" (prefill name/email từ Google) hoặc "Bỏ qua". Sidebar badge unread count. Email skip nếu thiếu RESEND_API_KEY (in-app log vẫn work) |
| ADMIN xoá đơn | nút trên `/admin/orders/[id]` | Soft delete (set `deletedAt`), auto hoàn kho vật tư đã xuất (idempotent qua `refundedAt`). Confirm dialog liệt kê 3 hệ quả. Restore qua DB nếu nhầm |
| Markup cost-rates | modal trong `/admin/cost-rates/new` + `[id]/edit` | Paste giá carrier → mở "Markup theo dải cân" → 9 dải EZWAY mặc định (0-5/5.5-10/10.5-15/15.5-20.5/21-44/45-99/100-299/300-499/500+) với %markup tinh chỉnh được → preview live bên phải (split 2 col) → apply vào form. Làm tròn 1k/5k/10k. localStorage cache ranges per service. MoneyInput thousand separator live `2.811.325` |
| Hoá đơn điện tử (HDDT) — manual log | card trong `/admin/orders/[id]` + `/admin/invoices` | Option D: app KHÔNG tích hợp API EasyInvoice (Softdreams không có gói API ở tier user mua). Admin xuất HDDT tay trên portal → nhập số/mã/ngày/tiền vào app để tracking. 1 Order ↔ N InvoiceRecord (B2B chia HDDT). Badge "Đã xuất HDDT" trên Order detail. Page `/admin/invoices` 2 tab: "Cần xuất" (đơn DELIVERED/CLOSED chưa có HDDT) + "Đã xuất tháng X" (filter month). Excel export `/api/invoices/export?from=X&to=Y` cho kế toán cuối tháng. Sidebar badge số đơn pending. Có thể cancel/delete record nếu nhầm |
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

**Forwarder Processing Phase A:** EZWAY là layer giữa SALE và chuyên tuyến
(Kango/KSN/Go). Workflow: SALE tạo đơn EZWAY → ADMIN/STAFF mở Copy Helper
(`/admin/orders/[id]/forward`) → click copy từng field → paste sang portal carrier
→ paste tracking carrier trả về EZWAY → đánh dấu "đã đẩy". Pain cũ: 5-10 phút
copy tay/đơn. Sau Phase A: 1-2 phút/đơn.

- `Recipient` tách khỏi `Customer` — 1 sender VN gửi N người nhận quốc tế.
- `InvoiceItem` basic (description / qty / unit / unitPriceUsd / totalValueUsd) —
  KHÔNG HS code, KHÔNG restricted items (carrier upstream lo).
- `Order.carrierForwardedAt/By/Code/TrackingNumber/...` + `customsExportType` +
  `serviceTier` + `requiresSignature` + `branchCode`.
- ADMIN có nút "Bỏ đánh dấu" để revert khi cần (race condition guard).
- Phase B (defer): browser automation, multi-carrier custom layouts.

**Migrations đã chạy:** `init_domain`, `add_warehouse`, `link_stock_to_order`, `add_startup_expenses`, `expense_categories_v2`, `add_sale_role_and_password`, `add_order_sales_user`, `add_google_auth_employee_profile`, `pickup_first`, `pickup_created_by`, `customer_sales_owner`, `add_payment_ar`, `stock_refund_marker`, `add_forwarder_processing`, `simplify_recipient_assignee`, `fix_cccd_pickup_ref`, `add_announcements`, `add_package_quantity_type`, `add_login_attempts`, `add_invoice_records` (20 tổng)

**Form Order sale (mẫu khai hàng):**
- Sale điền theo "FORM KHAI HÀNG MẪU" — đơn giản hoá, bỏ Phase A invoice items.
- Khách hàng: chọn khách cũ (filter theo SALE) **HOẶC** "Khách mới (gửi lần đầu)" inline
  — backend tạo Customer trước (auto code `CUS-xxxx`, salesUserId = SALE hiện tại
  nếu role SALE, chặn dup phone). Sau đó tạo Order + PickupRequest stub.
- Sender auto-fill từ Customer (tên, SĐT, **CCCD**, địa chỉ).
- Recipient gộp 1 field address; structured fields (country/state/city/postal/addr1-3)
  giữ trong DB nullable để ADMIN tách sau khi paste.
- Người phụ trách = `Order.assignedToUserId` (STAFF/DRIVER) — SALE tự điền tên OPS
  để cty tính hoa hồng người xử lý.
- Pickup checkbox + `linkedPickupCode` (reference text only) — Bill LUÔN hiển thị
  bất kể tick hay không. PickupRequest stub luôn được tạo từ bill trong form.

**Phân quyền URL (cứng theo role, không chỉ ẩn menu):**
- ADMIN-only: `/admin/sales`, `/admin/users`, `/admin/services`, `/admin/cost-items`,
  `/admin/cost-rates`, `/admin/startup-expenses`
- ADMIN/STAFF: `/admin/drivers`, `/admin/supplies` (+ Payment actions)
- Defense-in-depth: cả layout (chặn URL) lẫn server action (chặn POST trực tiếp).

## ⬜ Chưa làm / để sau

### Ưu tiên CAO
- [ ] **Deploy production Vercel + Neon** — doc đã chuẩn bị (`docs/deploy-vercel-neon.md`).
      User cần đăng ký Vercel + Neon + domain → tao implement build script + migrate
      data + smoke test. ~1-2 ngày. **Việc tiếp theo.**
- [ ] **HDDT auto-API** (đợi 3x scale) — chuyển sang Viettel SInvoice/MISA khi đơn
      vượt ~60-80/tháng (hiện 28/tháng × 5p gõ tay = 2.3h/tháng OK). Schema
      InvoiceRecord giữ nguyên, chỉ thêm `provider + externalId` khi upgrade.

### Tạm hoãn
- [ ] **Sepay Phase 2** — auto-reconcile chuyển khoản. Bị chặn vì Sepay Open
      Banking không support Techcombank (chỉ 11 bank: VCB/Sacombank/TPBank/
      VPBank/VietinBank/ACB/BIDV/MBBank/OCB/KienLongBank/MSB). Tạm thời nhập
      payment tay. Bật lại khi user mở thêm TK ở 1 bank trong list trên.
- [ ] **UI polish Linear-style** — brief `docs/ui-polish-plan.md`. 4-day plan
      với design token + brand color navy `#1E2F5E` + Geist Sans font. Đợi
      sau khi launch production.

### Ưu tiên trung bình
- [ ] **Driver portal v2** — bổ sung đổi trạng thái + upload ảnh (MVP read-only
      đã làm 2026-05-29). Hardening note `role-hardening-todo.md` — fix action
      gate cho DRIVER khi v2.
- [ ] **Backup automation** — script `scripts/backup-local-db.ps1` đã có +
      `docs/backup-restore.md`. User cần setup Task Scheduler Windows chạy daily 02:00.
- [ ] Test tự động (Playwright / Vitest) — chưa setup.
- [ ] Ảnh lệnh lấy hàng (PickupPhoto) — chưa làm. Lịch sử trạng thái đã làm xong.
- [ ] Báo cáo tiêu hao vật tư theo kỳ (tháng/quý).
- [ ] Sales: target/KPI theo sale (tuỳ chọn về sau).

## ⚠️ Nợ kỹ thuật / lưu ý
- **Git:** đã commit + push lên GitHub (`github.com/khaxuannguyen/ezway-ops-v2`, nhánh `master`). Cuối mỗi phiên nhớ commit + push.
- Đổi schema → BẮT BUỘC restart `npm run dev`.
- ESLint còn 1 warning ở `data-table.tsx` (giới hạn thư viện TanStack — không phải lỗi).
- Mã chi phí thành lập là `CP-xxxx` (Google Sheet dùng `CAPEX-xxx`).
- `.env` (không commit) cần `SESSION_SECRET` (>=16 ký tự) để ký session — đã có sẵn.
- `.env` có ô `GOOGLE_CLIENT_ID/SECRET` (đang trống) — điền để bật đăng nhập Google.
- Không làm "quên mật khẩu" qua email: dùng Google login (không mật khẩu) hoặc admin
  reset hộ. Đây là quyết định có chủ đích (xem `docs/profile-google-auth-plan.md`).
- **Lỗ hổng kinh doanh (đã có UI Payment Phase 1 nhập tay):** thiếu auto-reconcile
  qua webhook ngân hàng → Sepay Phase 2 là việc kế tiếp khi sẵn sàng. Sau khi có
  Phase 2: doanh thu Sales Portal mới là tiền THỰC THU đúng nghĩa.
- **Chống đá khách:** Customer.phone unique app-level (KHÔNG DB unique vì soft-delete).
  Inline tạo khách mới trong form Order cũng áp dụng dup-phone block (cùng action).
- Next.js 16 + Turbopack: `revalidatePath` **KHÔNG được phép gọi trong render** của
  Server Component → dùng layout `force-dynamic` cho route cần re-compute (đã áp dụng
  cho announcement badge sidebar).

## Quy ước làm việc
- Mỗi cuối phiên: cập nhật file này (đánh dấu ✅ việc xong, thêm việc mới).
- Mỗi đầu phiên: đọc file này → biết làm gì tiếp.
