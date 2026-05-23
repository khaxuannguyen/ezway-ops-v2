-- Đảo luồng: Lệnh lấy hàng (pickup) tạo trước, có mã; kiện hàng thuộc pickup; đơn nối sau.
-- Migration GIỮ DỮ LIỆU cũ: tạo pickup cho đơn chưa có, dời kiện hàng sang pickup.

-- 1. PickupRequest: thêm code (tạm nullable), cho orderId nullable.
ALTER TABLE "pickup_requests" ADD COLUMN "code" TEXT;
ALTER TABLE "pickup_requests" ALTER COLUMN "orderId" DROP NOT NULL;

-- 2. Đổi FK pickup_requests.orderId: Cascade -> SetNull (xoá đơn thì pickup vẫn còn).
ALTER TABLE "pickup_requests" DROP CONSTRAINT "pickup_requests_orderId_fkey";
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Package: thêm pickupRequestId (tạm nullable).
ALTER TABLE "packages" ADD COLUMN "pickupRequestId" TEXT;

-- 4. Tạo pickup cho các đơn có kiện hàng nhưng chưa có lệnh lấy hàng (giữ dữ liệu).
INSERT INTO "pickup_requests"
  ("id", "orderId", "currentStatus", "pickupAddress", "pickupContactName", "pickupContactPhone", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, o."id", 'PENDING', c."address", c."name", c."phone", now(), now()
FROM "orders" o
JOIN "customers" c ON c."id" = o."customerId"
WHERE EXISTS (SELECT 1 FROM "packages" p WHERE p."orderId" = o."id")
  AND NOT EXISTS (SELECT 1 FROM "pickup_requests" pr WHERE pr."orderId" = o."id");

-- 5. Sinh mã code cho mọi pickup chưa có.
UPDATE "pickup_requests" pr SET "code" = sub."c"
FROM (
  SELECT "id",
    'PK-MIG-' || lpad((row_number() OVER (ORDER BY "createdAt", "id"))::text, 4, '0') AS "c"
  FROM "pickup_requests"
) sub
WHERE pr."id" = sub."id";

-- 6. Dời kiện hàng sang pickup của đơn tương ứng.
UPDATE "packages" p SET "pickupRequestId" = pr."id"
FROM "pickup_requests" pr
WHERE pr."orderId" = p."orderId";

-- 7. code: NOT NULL + unique.
ALTER TABLE "pickup_requests" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "pickup_requests_code_key" ON "pickup_requests"("code");

-- 8. packages: pickupRequestId NOT NULL + FK + index; bỏ cột orderId.
ALTER TABLE "packages" ALTER COLUMN "pickupRequestId" SET NOT NULL;
ALTER TABLE "packages" DROP CONSTRAINT "packages_orderId_fkey";
DROP INDEX "packages_orderId_idx";
ALTER TABLE "packages" DROP COLUMN "orderId";
ALTER TABLE "packages" ADD CONSTRAINT "packages_pickupRequestId_fkey"
  FOREIGN KEY ("pickupRequestId") REFERENCES "pickup_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "packages_pickupRequestId_idx" ON "packages"("pickupRequestId");
