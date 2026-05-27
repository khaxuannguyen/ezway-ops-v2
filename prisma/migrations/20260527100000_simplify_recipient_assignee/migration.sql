-- Simplify form sale: Recipient address gộp 1 field + CCCD; structured fields → nullable.
-- Order: assignedToUserId (NV phụ trách đóng hàng / OPS).

-- Recipient: thêm nationalId, address (gộp); structured fields → nullable
ALTER TABLE "recipients" ADD COLUMN "nationalId" TEXT;
ALTER TABLE "recipients" ADD COLUMN "address" TEXT;
ALTER TABLE "recipients" ALTER COLUMN "country" DROP NOT NULL;
ALTER TABLE "recipients" ALTER COLUMN "city" DROP NOT NULL;
ALTER TABLE "recipients" ALTER COLUMN "postalCode" DROP NOT NULL;
ALTER TABLE "recipients" ALTER COLUMN "addressLine1" DROP NOT NULL;

-- Order: assignedToUserId (NV OPS đóng hàng — sale gán để tính hoa hồng)
ALTER TABLE "orders" ADD COLUMN "assignedToUserId" TEXT;
ALTER TABLE "orders" ADD CONSTRAINT "orders_assignedToUserId_fkey"
  FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "orders_assignedToUserId_idx" ON "orders"("assignedToUserId");
