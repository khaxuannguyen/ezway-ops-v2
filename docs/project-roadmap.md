# EZWAY Ops v2 — Project Roadmap

> **NGUỒN SỰ THẬT DUY NHẤT về tiến độ.** Mỗi phiên làm việc: đọc file này trước.
> Cập nhật cuối: 2026-05-21
> (Các file `plans/*.md` đã LỖI THỜI — bỏ qua, không phản ánh thực tế.)

## Khởi động mỗi ngày
1. Mở **Docker Desktop** → đợi container `ezway-postgres` tự lên (port 5433).
2. `npm run dev`
3. Nếu vừa đổi schema lần trước → restart dev server để nạp Prisma client mới.

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

**Tích hợp:** Đơn ↔ Lệnh lấy hàng · Đơn ↔ Kho (tự trừ tồn khi tạo đơn)

**Migrations đã chạy:** `init_domain`, `add_warehouse`, `link_stock_to_order`, `add_startup_expenses`, `expense_categories_v2`

## ⬜ Chưa làm / để sau

- [ ] **Auth / phân quyền** (Better Auth) — `lib/current-user.ts` còn hardcode admin. Phase riêng.
- [ ] **Driver portal** `/driver/*` — sau auth.
- [ ] Test tự động (Playwright / Vitest) — chưa setup.
- [ ] Ảnh lệnh lấy hàng + lịch sử trạng thái pickup (đã bỏ ở scope lean).
- [ ] Báo cáo tiêu hao vật tư theo kỳ (tháng/quý).
- [ ] Huỷ đơn → tự hoàn kho (hiện phải Nhập kho thủ công).

## ⚠️ Nợ kỹ thuật / lưu ý
- **Git:** đã commit toàn bộ app (`09bdc01`). CHƯA push — chưa có remote. Cần tạo repo GitHub + `git remote add origin` + push.
- Đổi schema → BẮT BUỘC restart `npm run dev`.
- ESLint còn 1 warning ở `data-table.tsx` (giới hạn thư viện TanStack — không phải lỗi).
- Mã chi phí thành lập là `CP-xxxx` (Google Sheet dùng `CAPEX-xxx`).

## Quy ước làm việc
- Mỗi cuối phiên: cập nhật file này (đánh dấu ✅ việc xong, thêm việc mới).
- Mỗi đầu phiên: đọc file này → biết làm gì tiếp.
