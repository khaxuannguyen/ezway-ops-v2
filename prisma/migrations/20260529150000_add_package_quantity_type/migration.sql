-- Package: thêm quantity + packageType cho form Bill mới.
-- Data-preserving: default 1 cho records cũ (1 row Package = 1 kiện thực tế).

CREATE TYPE "PackageType" AS ENUM ('CARTON', 'PALLET', 'ENVELOPE');

ALTER TABLE "packages"
  ADD COLUMN "quantity"    INTEGER       NOT NULL DEFAULT 1,
  ADD COLUMN "packageType" "PackageType" NOT NULL DEFAULT 'CARTON';
