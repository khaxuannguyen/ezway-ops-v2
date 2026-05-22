# EZWAY Ops v2 — Project Roadmap

> **NGUỒN SỰ THẬT DUY NHẤT về tiến độ.** Mỗi phiên làm việc: đọc file này trước.
> Cập nhật cuối: 2026-05-22 (đã xong Sales Portal)
> (Các file `plans/*.md` đã LỖI THỜI — bỏ qua, không phản ánh thực tế.)

## Khởi động mỗi ngày
1. Mở **Docker Desktop** → đợi container `ezway-postgres` tự lên (port 5433).
2. `npm run dev`
3. Nếu vừa đổi schema lần trước → restart dev server để nạp Prisma client mới.
4. Đăng nhập tại `/login`. Tài khoản admin: `admin@ezway.local` / `EZWay@2026`
   (nên đổi mật khẩu ở `/admin/users`). Reset mật khẩu bất kỳ qua CLI:
   `npx tsx prisma/set-password.ts <email> <mật khẩu>`.

## ✅ Đã hoàn thành (CRUD đầy đủ, lint + build pass)

| Module | Route | Ghi chú |
|---|---|---|
| Dashboard | `/admin/dashboard` | Số liệu Prisma thật |
| Khách hàng | `/admin/customers` | |
| Đơn hàng | `/admin/orders` | Multi-kiện, chi phí phát sinh, vật tư sử dụng |
| Kiện hàng | `/admin/packages` | |
| Dịch vụ | `/admin/services` | |
| Khoản chi phí | `/admin/cost-items` | |
| Bảng giá chi phí | `/admin/cost-rates` | Scale cân cố định, import CSV/paste, sửa-tất-cả |
| Tài xế | `/admin/drivers` | Tạo User role DRIVER kèm theo |
| Lệnh lấy hàng | `/admin/pickups` | Gán tài xế, đổi trạng thái |
| Kho vật tư | `/admin/supplies` | Nhập/Xuất/Kiểm kê + lịch sử |
| Chi phí thành lập | `/admin/startup-expenses` | Tổng hợp + tự gợi ý nhóm theo từ khóa |
| Tài khoản | `/admin/users` | CRUD tài khoản, gán role, đặt/reset mật khẩu (chỉ ADMIN) |
| Thống kê sale | `/admin/sales` | Doanh thu + lợi nhuận theo từng sale, lọc theo tháng (chỉ ADMIN) |
| Bán hàng của tôi | `/admin/my-sales` | Dashboard cá nhân SALE + BXH doanh thu (ẩn lợi nhuận người khác) |

**Tích hợp:** Đơn ↔ Lệnh lấy hàng · Đơn ↔ Kho (tự trừ tồn khi tạo đơn)

**Auth:** đăng nhập email + mật khẩu băm (bcryptjs) + session JWT-trong-cookie (jose).
`proxy.ts` chặn `/admin/*` nếu chưa đăng nhập; layout admin `requireUser()`; nav ẩn
mục theo role. `lib/auth` có `getCurrentUser / requireUser / requireRole`.
Roles: `ADMIN, STAFF, SALE, DRIVER`.

**Sales Portal:** `Order.salesUserId` (FK User role SALE). Form đơn có ô chọn sale —
người tạo là SALE thì tự gán chính họ. SALE chỉ thấy/sửa đơn của mình; đăng nhập vào
thẳng `/admin/my-sales`. BXH xếp theo doanh thu tháng. Thống kê admin xem ở `/admin/sales`.

**Migrations đã chạy:** `init_domain`, `add_warehouse`, `link_stock_to_order`, `add_startup_expenses`, `expense_categories_v2`, `add_sale_role_and_password`, `add_order_sales_user`

## ⬜ Chưa làm / để sau

- [ ] **Driver portal** `/driver/*` — VIỆC TIẾP THEO.
- [ ] **Siết quyền trang nhạy cảm** — hiện SALE bị ẩn menu Chi phí/Kho... nhưng nếu
      gõ thẳng URL vẫn vào được (chỉ `/admin/sales`, `/admin/users` mới chặn cứng theo
      role). Cân nhắc thêm `requireRole` cho cost-rates/startup-expenses nếu cần.
- [ ] Test tự động (Playwright / Vitest) — chưa setup.
- [ ] Ảnh lệnh lấy hàng + lịch sử trạng thái pickup (đã bỏ ở scope lean).
- [ ] Báo cáo tiêu hao vật tư theo kỳ (tháng/quý).
- [ ] Huỷ đơn → tự hoàn kho (hiện phải Nhập kho thủ công).
- [ ] Sales: target/KPI theo sale (tuỳ chọn về sau).

## ⚠️ Nợ kỹ thuật / lưu ý
- **Git:** đã commit + push lên GitHub (`github.com/khaxuannguyen/ezway-ops-v2`, nhánh `master`). Cuối mỗi phiên nhớ commit + push.
- Đổi schema → BẮT BUỘC restart `npm run dev`.
- ESLint còn 1 warning ở `data-table.tsx` (giới hạn thư viện TanStack — không phải lỗi).
- Mã chi phí thành lập là `CP-xxxx` (Google Sheet dùng `CAPEX-xxx`).
- `.env` (không commit) cần `SESSION_SECRET` (>=16 ký tự) để ký session — đã có sẵn.
- Chưa có "quên mật khẩu" tự phục vụ — admin reset hộ qua `/admin/users` hoặc CLI.

## Quy ước làm việc
- Mỗi cuối phiên: cập nhật file này (đánh dấu ✅ việc xong, thêm việc mới).
- Mỗi đầu phiên: đọc file này → biết làm gì tiếp.
