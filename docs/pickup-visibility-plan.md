# Kế hoạch: Dữ liệu riêng tư theo SALE (lệnh lấy hàng + khách hàng)

> Brainstorm chốt 2026-05-22 — triển khai 2026-05-23. Ước tính ~3-4h cả 2 phần.

## Mục tiêu

SALE chỉ thấy dữ liệu của chính mình — **lệnh lấy hàng** + **khách hàng** — để các
sale không đá khách / lẫn việc của nhau. ADMIN/STAFF thấy tất cả.

---

## PHẦN 1 — Lệnh lấy hàng riêng tư theo người tạo

### Quyết định đã chốt
- SALE chỉ thấy / sửa lệnh lấy hàng **do chính mình tạo**. ADMIN/STAFF thấy tất cả.
- SALE tạo Đơn: **server chặn cứng** — chỉ dùng được mã `PK-...` do chính họ tạo.
- 5 lệnh cũ: `createdById` gán cho tài khoản admin → trường NOT NULL.

### Thiết kế
- `PickupRequest` thêm `createdById String` (NOT NULL) + quan hệ `createdBy User`;
  User thêm `pickupsCreated PickupRequest[]`.
- `createPickup` gán `createdById = người đăng nhập`.
- SALE → list/detail/edit chỉ lệnh có `createdById = mình`; khác → notFound.
- `createOrder`: người tạo là SALE → pickup nhập vào phải có `createdById = họ`.

### Thay đổi file
| File | Việc |
|---|---|
| `prisma/schema.prisma` + migration `pickup_created_by` | `createdById` + FK + index; backfill data cũ = admin |
| `features/pickups/actions.ts` | `createPickup` gán createdById; `updatePickup` chặn SALE sửa lệnh người khác |
| `features/pickups/queries.ts` | `listPickups` lọc `createdById`; include `createdBy` (tên) |
| `features/pickups/components/pickups-table.tsx` | Thêm cột "Người tạo" |
| `app/admin/pickups/page.tsx` | SALE → lọc, tiêu đề "Lệnh lấy hàng của tôi" |
| `app/admin/pickups/[id]/page.tsx` + `[id]/edit/page.tsx` | SALE → guard `createdById === user.id` |
| `features/orders/actions.ts` | `createOrder`: SALE chỉ dùng mã pickup của chính mình |

### Migration `pickup_created_by`
```sql
ALTER TABLE "pickup_requests" ADD COLUMN "createdById" TEXT;
UPDATE "pickup_requests" SET "createdById" =
  (SELECT "id" FROM "users" WHERE "role" = 'ADMIN' ORDER BY "createdAt" LIMIT 1);
ALTER TABLE "pickup_requests" ALTER COLUMN "createdById" SET NOT NULL;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON UPDATE CASCADE;
CREATE INDEX "pickup_requests_createdById_idx" ON "pickup_requests"("createdById");
```

---

## PHẦN 2 — Khách hàng riêng tư theo SALE (chống đá khách)

### Quyết định đã chốt
- SALE chỉ thấy / sửa **khách hàng của mình**. ADMIN/STAFF thấy tất cả.
- SALE tạo khách → tự gán cho mình.
- **Chặn trùng SĐT:** ai tạo khách với SĐT đã tồn tại → chặn, báo lỗi. Đây mới là cái
  thực sự chống đá khách (chỉ ẩn thì sale vẫn tạo bản ghi trùng được).
- **ADMIN gỡ khoá:** ADMIN sửa được `salesUserId` của khách → chuyển khách sang sale
  khác (vd sale cũ nghỉ). SALE không thấy/sửa ô này.

### Thiết kế
- `Customer` thêm `salesUserId String?` (nullable — khách do ADMIN/STAFF tạo hoặc data
  cũ = không thuộc sale nào) + quan hệ `salesUser User?`; User thêm `customersOwned`.
- **Chống trùng SĐT làm ở tầng action, KHÔNG đặt unique index DB** — vì `Customer` có
  soft-delete (`deletedAt`); unique index sẽ chặn cả khách đã xoá. Action kiểm
  `findFirst({ where: { phone, deletedAt: null } })` → có thì chặn.
- `createCustomer`: SALE → `salesUserId = mình`; ADMIN/STAFF → null. Trùng SĐT (bất kỳ
  ai sở hữu) → lỗi "Khách hàng với SĐT này đã tồn tại, liên hệ quản trị viên."
- `updateCustomer`: SALE → guard chỉ sửa khách của mình, KHÔNG đổi `salesUserId`;
  ADMIN → đổi được `salesUserId` (gỡ khoá / chuyển sale).
- SALE → list/detail/edit chỉ khách có `salesUserId = mình`.
- **Form tạo Đơn:** ô chọn khách hàng lọc theo sale khi người tạo là SALE.

### Thay đổi file
| File | Việc |
|---|---|
| `prisma/schema.prisma` + migration `customer_sales_owner` | `Customer.salesUserId` FK nullable + index |
| `features/customers/schemas.ts` | Thêm `salesUserId` (dùng cho form ADMIN) |
| `features/customers/actions.ts` | `createCustomer` gán sale + chặn trùng SĐT; `updateCustomer` guard SALE + cho ADMIN đổi sale |
| `features/customers/queries.ts` | `listCustomers` + `listAllCustomersLite` lọc theo `salesUserId` cho SALE |
| `features/customers/components/customer-form.tsx` | ADMIN thấy ô "Nhân viên sale phụ trách"; SALE không |
| `features/customers/components/customers-table.tsx` | Thêm cột "Nhân viên sale" |
| `app/admin/customers/page.tsx` | SALE → lọc, tiêu đề "Khách hàng của tôi" |
| `app/admin/customers/[id]/page.tsx` + `[id]/edit/page.tsx` | SALE → guard `salesUserId === user.id` |
| `app/admin/orders/new/page.tsx` + `[id]/edit/page.tsx` | Ô chọn khách lọc theo sale khi người tạo là SALE |

### Migration `customer_sales_owner`
```sql
ALTER TABLE "customers" ADD COLUMN "salesUserId" TEXT;
ALTER TABLE "customers" ADD CONSTRAINT "customers_salesUserId_fkey"
  FOREIGN KEY ("salesUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "customers_salesUserId_idx" ON "customers"("salesUserId");
```
Data cũ: `salesUserId` = null (khách cũ không thuộc sale nào — chỉ ADMIN/STAFF thấy).

---

## Thứ tự thực hiện (cả 2 phần)

1. Schema cả 2 phần + 2 migration + `npx prisma generate`.
2. Phần 1 — Lệnh lấy hàng: actions → queries → trang → bảng.
3. Phần 2 — Khách hàng: actions → queries → form → trang → bảng.
4. Form tạo/sửa Đơn — lọc ô chọn khách theo sale.
5. Lint + build + smoke test.

## Rủi ro / lưu ý

- **STAFF tạo lệnh/khách hộ SALE sẽ không thuộc SALE đó:** luật "của chính mình" →
  STAFF tạo thì SALE không dùng/thấy được. Giả định: SALE tự tạo dữ liệu của mình.
- Chặn trùng SĐT ở tầng action có khe hở race rất nhỏ (2 request tạo cùng lúc) —
  chấp nhận được với tool nội bộ.
- Khách cũ + lệnh cũ không thuộc sale nào → chỉ ADMIN/STAFF thấy (đúng, là data seed).
- Đây vẫn là việc nhỏ-vừa. Module kinh doanh lớn còn nợ: **Thanh toán/công nợ** —
  doanh thu Sales Portal đang là tiền báo giá, chưa phải tiền thực thu.
