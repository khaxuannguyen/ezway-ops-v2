-- AlterTable: gắn khách hàng với nhân viên sale phụ trách (để SALE chỉ thấy khách của mình).
-- Nullable: khách do ADMIN/STAFF tạo hoặc data cũ = không thuộc sale nào.
ALTER TABLE "customers" ADD COLUMN "salesUserId" TEXT;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_salesUserId_fkey"
  FOREIGN KEY ("salesUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "customers_salesUserId_idx" ON "customers"("salesUserId");
