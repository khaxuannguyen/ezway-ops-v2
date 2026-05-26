-- Forwarder Processing Phase A: Recipient + InvoiceItem + Order forward fields.

-- Enum mới
CREATE TYPE "CustomsExportType" AS ENUM ('GIFT', 'MERCHANDISE', 'DOCUMENTS', 'SAMPLE', 'RETURN');

-- recipients (consignee quốc tế, tách khỏi Customer)
CREATE TABLE "recipients" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "customerId" TEXT,
  "companyName" TEXT,
  "contactName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "country" TEXT NOT NULL,
  "stateProvince" TEXT,
  "city" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "addressLine1" TEXT NOT NULL,
  "addressLine2" TEXT,
  "addressLine3" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "recipients_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "recipients_customerId_idx" ON "recipients"("customerId");
CREATE INDEX "recipients_phone_idx" ON "recipients"("phone");

-- invoice_items (khai báo hàng cơ bản — KHÔNG HS code)
CREATE TABLE "invoice_items" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit" TEXT NOT NULL DEFAULT 'Pcs',
  "unitPriceUsd" DECIMAL(10,2) NOT NULL,
  "totalValueUsd" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "invoice_items_orderId_idx" ON "invoice_items"("orderId");

-- Order: thêm fields recipient + customs + forwarder
ALTER TABLE "orders" ADD COLUMN "recipientId" TEXT;
ALTER TABLE "orders" ADD COLUMN "customsExportType" "CustomsExportType" NOT NULL DEFAULT 'GIFT';
ALTER TABLE "orders" ADD COLUMN "totalDeclaredValueUsd" DECIMAL(12,2);
ALTER TABLE "orders" ADD COLUMN "carrierForwardedAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "carrierForwardedById" TEXT;
ALTER TABLE "orders" ADD COLUMN "carrierCode" TEXT;
ALTER TABLE "orders" ADD COLUMN "carrierTrackingNumber" TEXT;
ALTER TABLE "orders" ADD COLUMN "carrierReferenceCode" TEXT;
ALTER TABLE "orders" ADD COLUMN "carrierNote" TEXT;
ALTER TABLE "orders" ADD COLUMN "serviceTier" TEXT;
ALTER TABLE "orders" ADD COLUMN "requiresSignature" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "orders" ADD COLUMN "branchCode" TEXT;

ALTER TABLE "orders" ADD CONSTRAINT "orders_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_carrierForwardedById_fkey"
  FOREIGN KEY ("carrierForwardedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "orders_recipientId_idx" ON "orders"("recipientId");
CREATE INDEX "orders_carrierForwardedAt_idx" ON "orders"("carrierForwardedAt");

-- Backfill: đơn DELIVERED/CLOSED coi như đã forwarded (best-effort)
UPDATE "orders" SET "carrierForwardedAt" = "updatedAt"
WHERE "status" IN ('DELIVERED', 'CLOSED') AND "carrierForwardedAt" IS NULL;
