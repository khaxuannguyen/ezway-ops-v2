-- Payment / AR Phase 1
-- 1. Xoá payment placeholder cũ (Payment record bây giờ = tiền đã vào, không còn UNPAID).
DELETE FROM "payments";

-- 2. OrderStatus thêm CLOSED (đặt trước CANCELLED cho gọn).
ALTER TYPE "OrderStatus" ADD VALUE 'CLOSED' BEFORE 'CANCELLED';

-- 3. PaymentMethod enum mới.
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'COD', 'OTHER');

-- 4. Order: paidVnd + paymentStatus (denormalized; sync trong transaction mỗi lần đổi payment).
ALTER TABLE "orders" ADD COLUMN "paidVnd" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- 5. Payment cleanup:
--    - drop status (đặt sai chỗ — Order mới giữ paymentStatus)
--    - method: String? -> PaymentMethod enum NOT NULL
--    - paidAt: required (record payment = đã có ngày thu)
--    - thêm recordedById + FK + index (ai ghi nhận)
ALTER TABLE "payments" DROP COLUMN "status";
ALTER TABLE "payments" DROP COLUMN "method";
ALTER TABLE "payments" ADD COLUMN "method" "PaymentMethod" NOT NULL DEFAULT 'CASH';
ALTER TABLE "payments" ALTER COLUMN "paidAt" SET NOT NULL;
ALTER TABLE "payments" ADD COLUMN "recordedById" TEXT NOT NULL;
ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON UPDATE CASCADE;

-- 6. Indexes.
DROP INDEX IF EXISTS "payments_orderId_status_idx";
CREATE INDEX "payments_orderId_paidAt_idx" ON "payments"("orderId", "paidAt");
CREATE INDEX "payments_recordedById_paidAt_idx" ON "payments"("recordedById", "paidAt");
