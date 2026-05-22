-- AlterTable: gắn đơn hàng với nhân viên sale (User role SALE) phụ trách.
ALTER TABLE "orders" ADD COLUMN "salesUserId" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_salesUserId_fkey" FOREIGN KEY ("salesUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "orders_salesUserId_createdAt_idx" ON "orders"("salesUserId", "createdAt");
