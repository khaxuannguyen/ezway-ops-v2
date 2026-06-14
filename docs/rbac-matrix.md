# RBAC Permission Matrix — EZWAY Ops

> **Single source of truth** cho phân quyền 4 roles. Mọi thay đổi RBAC phải
> reflect cả frontend (UI hide menu) + backend (action guard + page guard).
> Cập nhật: 2026-06-05 (Sepay → ADMIN-only).

## 4 Roles

| Role | Mô tả | Đăng nhập vào |
|---|---|---|
| **ADMIN** | Quản trị cấp cao — full access + system config | `/admin/*` |
| **STAFF** | Vận hành cơ bản — orders/pickups/customers + assign drivers | `/admin/*` (subset) |
| **SALE** | Nhân viên kinh doanh — chỉ data của mình | `/admin/*` (data scope filtered) → redirect `/admin/my-sales` |
| **DRIVER** | Tài xế giao nhận — chỉ lệnh được gán | `/driver/*` (admin layout tự redirect) |

## Permission Matrix

Legend: ✅ Có quyền · ❌ Không · 🔒 Chỉ data scope (filtered theo ownership) · ➖ N/A

| Module | Route | ADMIN | STAFF | SALE | DRIVER |
|---|---|---|---|---|---|
| Dashboard | `/admin/dashboard` | ✅ | ✅ | → redirect `/admin/my-sales` | → redirect `/driver` |
| Thông báo | `/admin/announcements` | ✅ + tạo/sửa/xoá | ✅ xem | ✅ xem | ✅ xem (theo `visibleToRoles`) |
| Đơn hàng (list+detail) | `/admin/orders` | ✅ full | ✅ full | 🔒 `salesUserId = me` | ❌ |
| Tạo/sửa đơn | `/admin/orders/new`, `/edit` | ✅ | ✅ | 🔒 chỉ đơn của mình | ❌ |
| Đẩy carrier | `/admin/orders/[id]/forward` | ✅ | ✅ | ❌ | ❌ |
| Xoá đơn (soft delete) | nút trong detail | ✅ | ❌ | ❌ | ❌ |
| Processing queue | `/admin/processing` | ✅ | ✅ | ❌ | ❌ |
| Lệnh lấy hàng | `/admin/pickups` | ✅ full | ✅ full | 🔒 `createdById = me` | ❌ |
| Đổi status pickup | action `updatePickupStatus` | ✅ | ✅ | ❌ | ⚠️ TBD (Driver Portal v2) |
| Gán driver | trong pickup edit | ✅ | ✅ | ❌ | ❌ |
| Kho vật tư | `/admin/supplies` | ✅ | ✅ | ❌ | ❌ |
| Tài xế (Driver mgmt) | `/admin/drivers` | ✅ | ✅ | ❌ | ❌ |
| Hoá đơn điện tử | `/admin/invoices` | ✅ | ✅ | ❌ | ❌ |
| **Đối soát Sepay** | `/admin/sepay` | ✅ | ❌ | ❌ | ❌ |
| Khách hàng | `/admin/customers` | ✅ full | ✅ full | 🔒 `salesUserId = me` + chặn trùng phone | ❌ |
| Dịch vụ vận chuyển | `/admin/services` | ✅ | ❌ | ❌ | ❌ |
| Bảng giá chi phí | `/admin/cost-rates` | ✅ | ❌ | ❌ | ❌ |
| Khoản chi phí | `/admin/cost-items` | ✅ | ❌ | ❌ | ❌ |
| Chi phí thành lập | `/admin/startup-expenses` | ✅ | ❌ | ❌ | ❌ |
| Thống kê sale (admin) | `/admin/sales` | ✅ | ❌ | ❌ | ❌ |
| Sales portal cá nhân | `/admin/my-sales` | ❌ (redirect dashboard) | ❌ (redirect dashboard) | ✅ chỉ của mình | ❌ |
| Tài khoản người dùng | `/admin/users` | ✅ | ❌ | ❌ | ❌ |
| Yêu cầu cấp quyền | `/admin/pending-invites` | ✅ | ❌ | ❌ | ❌ |
| Profile cá nhân | `/admin/profile` | ✅ | ✅ | ✅ | ✅ (qua /driver?) |
| Driver portal | `/driver`, `/driver/pickups/[id]` | ❌ (redirect /admin) | ❌ | ❌ | ✅ chỉ lệnh `driver.userId = me` |

## Payment actions

| Action | ADMIN | STAFF | SALE | DRIVER |
|---|---|---|---|---|
| Ghi nhận Payment tay | ✅ | ✅ | ❌ (chỉ xem) | ❌ |
| Sửa/xoá Payment | ✅ | ✅ | ❌ | ❌ |
| Match Sepay tx tay | ✅ | ❌ | ❌ | ❌ |
| Ignore Sepay tx | ✅ | ❌ | ❌ | ❌ |

## HDDT (InvoiceRecord) actions

| Action | ADMIN | STAFF | SALE | DRIVER |
|---|---|---|---|---|
| Ghi HDDT mới | ✅ | ✅ | ❌ | ❌ |
| Sửa/cancel/xoá HDDT | ✅ | ✅ | ❌ | ❌ |
| Excel export tháng | ✅ | ✅ | ❌ | ❌ |

## Implementation layers (defense-in-depth)

| Layer | Cơ chế | Files |
|---|---|---|
| **L1: Proxy** | Chặn unauth `/admin/*` + `/driver/*` → redirect `/login` | `proxy.ts` |
| **L2: Layout** | `app/admin/layout.tsx` → DRIVER → `/driver`. Subfolder layouts với `requireRole("ADMIN")` cho cost-items/cost-rates/services/startup-expenses; `requireRole("ADMIN","STAFF")` cho drivers/processing/supplies | `app/admin/*/layout.tsx` |
| **L3: Page guard** | `requireRole(...)` hoặc `if (user.role !== "ADMIN") redirect()` ở từng page cần (sales/users/sepay/invoices/pending-invites/my-sales) | `app/admin/**/page.tsx` |
| **L4: Action guard** | Mọi server action có `"use server"` đầu file phải `requireRole(...)` hoặc check `actor.role` inline. Defense KHÔNG chỉ dựa UI hide | `features/*/actions.ts` |
| **L5: Data scope** | Queries filter `salesUserId/createdById/driverId === actor.id` cho SALE/DRIVER | `features/*/queries.ts` + `app/admin/**/page.tsx` |
| **L6: UI hide** | Sidebar menu hide theo `roles?: UserRole[]` field. Nav lib + `Sidebar` component | `lib/nav.ts` + `components/admin/sidebar.tsx` |

## Known hardening gaps (defer)

| Gap | Severity | Defer note |
|---|---|---|
| `createPickup` action không chặn DRIVER role | LOW | UI đã chặn, action thoáng. Fix khi làm Driver Portal v2 |
| `updatePickupStatus` cho DRIVER pass | LOW (cố ý) | Driver Portal v2 sẽ dùng, lúc đó thêm check `pickup.driver.userId === actor.id` |
| Truy cập URL không quyền hiện redirect dashboard thay vì trang 403 | LOW | UX polish, defer v2 |

## Quick reference cho dev

**Khi thêm route mới**, hỏi 4 câu:
1. Layout nào parent? Có inherit role gate sẵn không?
2. Cần role gate page-level? → `requireRole(...)` đầu file hoặc `if (user.role !== X) redirect()`
3. Có data ownership check? → SALE filter `salesUserId/createdById === me`
4. Nav menu nào? → thêm `roles?: [...]` vào `lib/nav.ts` (hide khỏi UI)

**Khi thêm action mới**, hỏi 3 câu:
1. Role nào được call? → `requireRole(...)` đầu function (KHÔNG chỉ dùng UI)
2. Cần ownership check? → load record + verify `record.salesUserId/createdById === actor.id`
3. Mutate state nhạy cảm? → log AuditLog (TBD)
