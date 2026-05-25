# Kế hoạch: Payment / Công nợ — Phase 1

> Brainstorm chốt 2026-05-23 — triển khai phiên sau. Ước tính ~1 ngày code.

## Mục tiêu

Trả lời 3 câu hỏi kinh doanh mà hiện tại app KHÔNG trả lời được:
1. Khách nào còn nợ ta, nợ bao nhiêu?
2. Tháng này thu được bao nhiêu tiền **thật** (không phải báo giá)?
3. Sale nào kéo về tiền thật, sale nào chỉ ghi đơn rồi để công nợ?

Trước go-live phải làm — không log payment từ day-1 → vài tháng sau có data nhưng
không cách nào biết khách nào đã trả → backfill từ excel = thảm họa.

---

## Quyết định đã chốt (brainstorm 2026-05-23)

| Câu hỏi | Đáp |
|---|---|
| Ai ghi/sửa/xoá Payment? | ADMIN + STAFF. SALE **NO** (xung đột hoa hồng). |
| Sales Portal hiển thị gì? | 2 cột song song — "Doanh thu báo giá" + "Đã thu". |
| Đơn thu đủ + đã giao → auto đóng đơn? | Có. Cần thêm `CLOSED` vào `OrderStatus`. |
| 1 payment cho nhiều đơn (batch transfer B2B)? | **Không** Phase 1 — YAGNI. |
| Tích hợp Sepay/ngân hàng webhook? | **Không** Phase 1 — ghi tay. |
| In phiếu thu PDF? | **Không** Phase 1. |
| Refund? | Dùng `amountVnd` âm + ghi chú. Không tạo flow riêng. |
| Trang `/admin/payments` riêng? | **Không** Phase 1 — chỉ thao tác trong Order detail. |

---

## Thiết kế Schema

### Cleanup `Payment`
- **Drop** `Payment.status` (PaymentStatus đặt sai chỗ — record payment = tiền đã vào).
- Đổi `method` từ `String?` → enum `PaymentMethod` (`CASH | BANK_TRANSFER | COD | OTHER`).
- `paidAt` đổi từ `DateTime?` → `DateTime` (required — đã thu thì phải có ngày).
- Thêm `recordedById String` (NOT NULL) + FK `recordedBy User` — accountability.
- `amountVnd Int` giữ nguyên — cho phép âm cho REFUND.
- Thêm index `[recordedById, paidAt]` cho báo cáo theo người nhập.

### Thêm vào `Order`
- `paidVnd Int @default(0)` — tổng tiền đã thu (denormalized; sync trong transaction).
- `paymentStatus PaymentStatus @default(UNPAID)` — tái dùng enum đã có
  (UNPAID/PARTIAL/PAID/REFUNDED). Auto-tính từ `paidVnd` vs `totalFeeVnd`.

### Thêm vào `OrderStatus`
- Enum value mới: `CLOSED` (sau `DELIVERED`).
- Quy tắc auto-flip: `paymentStatus = PAID` + `status ∈ {DELIVERED}` → `status = CLOSED`.
  Chỉ trigger 1 chiều, không tự revert khi sửa payment.

### Migration `add_payment_ar`
```sql
-- 1. OrderStatus thêm CLOSED
ALTER TYPE "OrderStatus" ADD VALUE 'CLOSED';

-- 2. PaymentMethod enum mới
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'COD', 'OTHER');

-- 3. Order — paidVnd + paymentStatus
ALTER TABLE "orders" ADD COLUMN "paidVnd" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- 4. Payment — bỏ status cũ, đổi method, thêm recordedBy
ALTER TABLE "payments" DROP COLUMN "status";

-- method: String? → enum (chưa có data thật → drop + add)
ALTER TABLE "payments" DROP COLUMN "method";
ALTER TABLE "payments" ADD COLUMN "method" "PaymentMethod" NOT NULL DEFAULT 'CASH';

-- paidAt required (backfill = createdAt cho data cũ nếu có)
UPDATE "payments" SET "paidAt" = "createdAt" WHERE "paidAt" IS NULL;
ALTER TABLE "payments" ALTER COLUMN "paidAt" SET NOT NULL;

-- recordedById: nullable trước → backfill admin → SET NOT NULL
ALTER TABLE "payments" ADD COLUMN "recordedById" TEXT;
UPDATE "payments" SET "recordedById" =
  (SELECT "id" FROM "users" WHERE "role" = 'ADMIN' ORDER BY "createdAt" LIMIT 1);
ALTER TABLE "payments" ALTER COLUMN "recordedById" SET NOT NULL;
ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON UPDATE CASCADE;
CREATE INDEX "payments_recordedById_paidAt_idx" ON "payments"("recordedById", "paidAt");
```

User cần thêm relation `paymentsRecorded Payment[]` ở model `User`.

---

## Thiết kế Code

### Feature folder mới `features/payments/`
```
features/payments/
  schemas.ts       — Zod: createPayment, updatePayment
  queries.ts       — listByOrder, listByCustomer (cho card công nợ), sumByPeriod
  actions.ts       — createPayment, updatePayment, deletePayment (transaction)
  components/
    payment-form.tsx       — modal/dialog form ghi nhận
    payments-table.tsx     — bảng list trong tab Order detail
```

### Logic cốt lõi — sync `Order.paidVnd` + `paymentStatus` + auto-flip status

Mọi hành động create/update/delete Payment đi qua **1 transaction**:

```ts
// pseudo-code
await prisma.$transaction(async (tx) => {
  // 1. Apply payment change
  await tx.payment.create(...) // hoặc update/delete

  // 2. Recompute paidVnd
  const sum = await tx.payment.aggregate({
    where: { orderId },
    _sum: { amountVnd: true },
  });
  const paidVnd = sum._sum.amountVnd ?? 0;

  // 3. Compute new paymentStatus
  const order = await tx.order.findUnique({ where: { id: orderId } });
  const paymentStatus =
    paidVnd <= 0 ? "UNPAID" :
    paidVnd < order.totalFeeVnd ? "PARTIAL" :
    paidVnd === order.totalFeeVnd ? "PAID" :
    "PAID"; // overpaid → vẫn PAID, ghi chú trong notes

  // 4. Auto-flip status nếu thoả điều kiện
  let nextStatus = order.status;
  if (paymentStatus === "PAID" && order.status === "DELIVERED") {
    nextStatus = "CLOSED";
  }

  // 5. Update order
  await tx.order.update({
    where: { id: orderId },
    data: { paidVnd, paymentStatus, status: nextStatus },
  });
});
```

### Permissions
- `createPayment / updatePayment / deletePayment`: `requireRole(["ADMIN", "STAFF"])`.
- Nhưng SALE vẫn được **đọc** payments của đơn họ phụ trách (để tự biết tình trạng).
- Server actions trả về `ActionResult` như các module khác.

### Audit log
- Mỗi create/update/delete → ghi `AuditLog` (đã có model sẵn).
- `entityType = "Payment"`, `before/after JSON`, `userId = recordedById`.

---

## Thay đổi UI

| File | Việc |
|---|---|
| `app/admin/orders/[id]/page.tsx` | Thêm tab/section "Thanh toán" — bảng payments + nút "Ghi nhận" (chỉ ADMIN/STAFF) + 3 chỉ số: Tổng cước, Đã thu, Còn lại; badge `paymentStatus`. |
| `app/admin/orders/page.tsx` | Bảng orders thêm cột "Thanh toán" (badge UNPAID/PARTIAL/PAID/REFUNDED). |
| `app/admin/customers/[id]/page.tsx` | Card "Công nợ" — tổng đơn chưa thu đủ + link tới list đơn UNPAID/PARTIAL của khách. |
| `app/admin/sales/page.tsx` | Thêm cột "Đã thu" cạnh "Doanh thu báo giá"; thêm cột "Công nợ" = báo giá − thu. |
| `app/admin/my-sales/page.tsx` | Tương tự `/sales` cho cá nhân SALE. BXH thêm tuỳ chọn xếp theo "Đã thu" (mặc định vẫn báo giá để không phá UX cũ). |
| `app/admin/dashboard/page.tsx` | Thêm widget "Công nợ hiện tại" — tổng `totalFeeVnd − paidVnd` của đơn chưa CLOSED/CANCELLED. |
| `lib/nav.ts` | KHÔNG thêm menu Payment riêng (chỉ thao tác trong Order detail). |
| `components/shared/payment-status-badge.tsx` | Component mới — badge theo enum. |

---

## Thay đổi Sales Portal queries

`features/sales/queries.ts` (hoặc tên hiện tại):
- Đang aggregate `totalFeeVnd` (báo giá). **Giữ nguyên** — đổi tên alias thành `quotedRevenueVnd`.
- Thêm aggregate `paidVnd` cùng kỳ → trả về `collectedRevenueVnd`.
- Tính `debtVnd = quotedRevenueVnd - collectedRevenueVnd`.

Hoa hồng (nếu tính sau này): chỉ tính trên `collectedRevenueVnd` — không phải báo giá.
Phase 1 chỉ hiển thị, chưa làm logic hoa hồng tự động.

---

## Out of scope Phase 1 (đẩy về sau)

- **Sepay / ngân hàng webhook** auto-reconcile. (Phase 2 — cần Sepay account + endpoint nhận webhook.)
- **1 payment cho nhiều đơn** (B2B batch transfer). (Phase 2 — đổi schema thành many-to-many.)
- **In phiếu thu PDF / hoá đơn VAT**.
- **Aging report** — đơn quá X ngày chưa thu, gửi nhắc nhở.
- **Driver COD flow** — tài xế tự ghi nhận COD khi giao xong. (Đợi Driver portal.)
- **Trang `/admin/payments` riêng** với filter cross-order.
- **Hoa hồng tự động** trên `collectedRevenueVnd`.
- **Refund flow riêng** — Phase 1 dùng số âm + ghi chú.

---

## Rủi ro / lưu ý

1. **`paidVnd` denormalized**: phải sync trong transaction mọi lúc. Nếu skip → drift.
   Mitigation: chỉ có 3 entry point (create/update/delete payment) đi qua helper chung.
2. **`OrderStatus.CLOSED` mới**: cần update tất cả nơi đang hiển thị/filter theo status
   (orders table, dashboard widget đếm đơn, queries thống kê). Phải grep `OrderStatus` toàn repo.
3. **Auto-flip CLOSED 1 chiều**: nếu user xoá payment làm `paymentStatus` không còn PAID,
   `Order.status` KHÔNG tự revert từ CLOSED. Cố ý — tránh state ping-pong. ADMIN sửa tay nếu cần.
4. **Refund âm**: `paidVnd` có thể về 0 hoặc âm. UI cần hiển thị rõ; không cho `Còn lại < 0`
   mà ghi "Hoàn dư X".
5. **`Payment.status` drop**: data hiện tại (nếu có) sẽ mất giá trị status. Pre-launch → OK.
6. **Migration thêm enum value**: `ALTER TYPE ADD VALUE` không chạy trong transaction
   trong vài version Postgres cũ. Postgres 16 (đang dùng) thì OK.

---

## Success metrics

- [ ] Tạo 1 đơn mới → tab Thanh toán hiển thị "Còn lại = Tổng cước, Đã thu = 0", badge UNPAID.
- [ ] Ghi 1 payment < tổng → PARTIAL; UI hiển thị Còn lại đúng.
- [ ] Ghi tiếp payment cho đủ → PAID; nếu order đã DELIVERED → auto CLOSED.
- [ ] Xoá payment → paidVnd recompute, status downgrade về PARTIAL hoặc UNPAID; order
      KHÔNG revert khỏi CLOSED (cố ý).
- [ ] Sales Portal hiển thị 2 cột "Báo giá" + "Đã thu" + "Công nợ" cho từng sale, lọc tháng.
- [ ] Customer detail hiển thị card "Công nợ" với đúng tổng.
- [ ] Dashboard widget "Công nợ hiện tại" khớp tổng đơn active.
- [ ] SALE thấy bảng Payment (read-only), không thấy nút "Ghi nhận".
- [ ] Lint + build pass.

---

## Thứ tự thực hiện đề xuất

1. Schema + migration `add_payment_ar` + chạy `migrate deploy` + regen client.
2. `features/payments/` (schemas + queries + actions + components).
3. Order detail: nhúng tab "Thanh toán".
4. Orders table: cột payment status.
5. Customer detail: card công nợ.
6. Sales Portal queries + UI: thêm "Đã thu" + "Công nợ".
7. Dashboard widget công nợ.
8. Grep `OrderStatus` → handle `CLOSED` mọi nơi.
9. Lint + build + smoke test (chạy 3 scenario success metrics chính).
10. Cập nhật `docs/project-roadmap.md`.

---

## Sau Phase 1

Khi data thật bắt đầu chảy + business chứng minh cần thì mở Phase 2:
- Sepay webhook auto-reconcile.
- Aging report + nhắc nợ qua email/Zalo.
- 1 payment ↔ nhiều đơn (B2B).
- Phiếu thu PDF.
- Hoa hồng tự động.
