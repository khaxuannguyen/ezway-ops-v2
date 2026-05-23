-- AlterTable: ghi nhận người tạo lệnh lấy hàng (để SALE chỉ thấy lệnh của mình).
ALTER TABLE "pickup_requests" ADD COLUMN "createdById" TEXT;

-- Backfill: lệnh cũ gán cho tài khoản admin sớm nhất.
UPDATE "pickup_requests" SET "createdById" =
  (SELECT "id" FROM "users" WHERE "role" = 'ADMIN' ORDER BY "createdAt" LIMIT 1);

ALTER TABLE "pickup_requests" ALTER COLUMN "createdById" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "pickup_requests_createdById_idx" ON "pickup_requests"("createdById");
