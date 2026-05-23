# Kế hoạch: Lệnh lấy hàng tạo trước — Đơn tham chiếu mã pickup

> Brainstorm chốt 2026-05-22. Đây là thay đổi LÕI (đụng cách tính cước).

## Vấn đề

Hiện tại: tạo **Đơn trước** → tạo Lệnh lấy hàng cho đơn đó. Nhưng SALE chưa có đơn
thì không tạo được lệnh lấy hàng. Cần đảo luồng.

## Quyết định đã chốt

- Lệnh lấy hàng (pickup) **tạo độc lập**, không cần đơn. Có mã **`PK-xxxx`**.
- Pickup ghi nhận **kiện hàng từng thùng** (cân thực + D×R×C) — giữ cân quy đổi.
- **1 pickup = 1 đơn.**
- Pickup **không gắn khách hàng** — tự nhập địa chỉ + người liên hệ.
- Đơn nhập mã `PK-xxxx` → kế thừa kiện hàng → tự tính cước.

## Luồng mới

1. **Tạo Lệnh lấy hàng:** địa chỉ/liên hệ/giờ hẹn + **danh sách kiện** (cân + kích
   thước từng thùng) → hệ thống cấp mã `PK-xxxx`.
2. ADMIN/STAFF gán tài xế + đổi trạng thái (giữ nguyên như vừa làm — SALE không gán).
3. **Tạo Đơn:** nhập mã `PK-xxxx` + khách hàng + dịch vụ + chi phí phát sinh + cước
   thu khách → hệ thống lấy kiện từ pickup, tính cân quy đổi theo hệ số của dịch vụ
   → ra base cost + lợi nhuận tự động.

## Thay đổi schema

- `PickupRequest`:
  - `orderId` → **nullable** (pickup sống độc lập; giữ `@unique` — Postgres cho phép
    nhiều NULL, vẫn 1-1 khi đã nối).
  - thêm `code String @unique` — mã `PK-xxxx`.
- `Package`: đổi quan hệ `orderId` → **`pickupRequestId`** (kiện thuộc Lệnh lấy hàng,
  không thuộc Đơn nữa — vì kiện được cân/đo lúc gom hàng).
- `Order`: giữ các snapshot `chargeableWeightKg`, `volumetricDivisor`,
  `baseRateSnapshotVnd`, `serviceCostRateIdSnapshot`, `baseCostVnd`. Đọc kiện qua
  `order.pickupRequest.packages`.

## ⚠️ Điểm tinh tế: hệ số quy đổi

Cân quy đổi = D×R×C ÷ hệ số. Hệ số thuộc **Dịch vụ** — mà dịch vụ chọn ở Đơn, KHÔNG
ở Pickup. → Giải pháp: Pickup lưu **kích thước thô** từng kiện; **cân quy đổi + cân
tính cước tính ở bước tạo Đơn** (khi đã biết dịch vụ → hệ số). Trang pickup hiển thị
cân quy đổi tạm theo hệ số mặc định 5000 chỉ để tham khảo.

## Thay đổi theo file

**Schema/migration**
- `prisma/schema.prisma` + migration `pickup_first` (đổi quan hệ Package, thêm fields).

**Pickup**
- `lib/codegen.ts` — thêm `buildPickupCode`.
- `features/pickups/schemas.ts` — input thêm mảng kiện hàng, bỏ `orderId`.
- `features/pickups/queries.ts` — gắn `code`, include `packages`, bỏ ràng buộc đơn.
- `features/pickups/actions.ts` — `createPickup` sinh mã + tạo kiện.
- `features/pickups/components/pickup-form.tsx` — thêm phần nhập kiện, bỏ ô chọn đơn.
- `app/admin/pickups/*` — new/edit/detail/list cập nhật.

**Order**
- `features/orders/schemas.ts` — bỏ `packages`, thêm `pickupCode`.
- `features/orders/actions.ts` — `createOrder`: tra pickup theo mã, kiểm tra (tồn
  tại / chưa nối đơn khác / có kiện), tính cân tính cước từ kiện pickup → cước.
- `features/orders/components/order-create-form.tsx` — bỏ phần "Kiện hàng", thêm ô
  "Mã lệnh lấy hàng".
- `app/admin/orders/new` + `[id]` (chi tiết) + `[id]/edit` — cập nhật; trang chi tiết
  đọc kiện qua pickup.

## Di trú dữ liệu cũ

Đổi `Package.orderId` → `pickupRequestId` phá vỡ dữ liệu hiện có. Dữ liệu hiện tại là
**seed/test** (pre-go-live). **Đề xuất: reset** — xoá đơn/lệnh lấy hàng/kiện test rồi
nhập lại theo luồng mới. **CẦN XÁC NHẬN trước khi chạy migration.**

## Thứ tự thực hiện (gate-safe)

1. Schema + migration + `npx prisma generate`.
2. `lib/codegen` — `buildPickupCode`.
3. Pickup: schemas → queries → actions → form → 4 trang.
4. Order: schemas → actions → form → 3 trang.
5. Trang chi tiết đơn: đọc kiện qua pickup.
6. Lint + build + smoke test.

## Rủi ro

- **Thay đổi LÕI** — đụng tính cước, to hơn auth/sales. Test kỹ phần tính cước.
- Việc "SALE tạo lệnh lấy hàng" vừa làm sẽ bị sửa tiếp (form pickup đổi) — phần phân
  quyền role giữ nguyên, chỉ thêm phần nhập kiện.
- **Nên commit checkpoint** (Google auth + profile + SALE-pickup) TRƯỚC khi bắt đầu
  phase này, để có mốc quay lại.

## Việc còn mở (xác nhận trước khi code)

1. Đồng ý **reset dữ liệu test** cũ không?
2. Lúc tạo Đơn nhập mã pickup: cần xem trước cân/cước ngay (live preview) hay tính khi
   bấm Lưu là đủ? (đề xuất: tính khi Lưu cho gọn.)
