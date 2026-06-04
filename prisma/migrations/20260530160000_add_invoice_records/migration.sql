-- HDDT (Hoá đơn điện tử) ghi nhận thủ công sau khi admin xuất ở portal EasyInvoice.
-- Không tích hợp API — chỉ lưu metadata để tracking + đối soát kế toán.
-- 1 Order ↔ N InvoiceRecord (B2B có thể chia HDDT).

CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'CANCELLED');

CREATE TABLE "invoice_records" (
  "id"            TEXT            NOT NULL,
  "orderId"       TEXT            NOT NULL,
  "invoiceNumber" TEXT            NOT NULL,
  "lookupCode"    TEXT,
  "issuedAt"      TIMESTAMP(3)    NOT NULL,
  "totalVnd"      INTEGER         NOT NULL,
  "status"        "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
  "notes"         TEXT,
  "recordedById"  TEXT            NOT NULL,
  "createdAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "invoice_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoice_records_orderId_issuedAt_idx"
  ON "invoice_records"("orderId", "issuedAt");

CREATE INDEX "invoice_records_issuedAt_idx"
  ON "invoice_records"("issuedAt");

CREATE INDEX "invoice_records_invoiceNumber_idx"
  ON "invoice_records"("invoiceNumber");

ALTER TABLE "invoice_records"
  ADD CONSTRAINT "invoice_records_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoice_records"
  ADD CONSTRAINT "invoice_records_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
