-- Sepay Phase 2: webhook auto-reconcile bank transfer (MB Bank — 2026-05-31).
-- Idempotent qua sepay_transactions.sepayId UNIQUE.
-- payments.sepayTransactionId nullable + UNIQUE để 1 SepayTx ↔ tối đa 1 Payment.

CREATE TYPE "SepayMatchStatus" AS ENUM (
  'PENDING',
  'MATCHED',
  'UNMATCHED',
  'AMBIGUOUS',
  'IGNORED'
);

CREATE TABLE "sepay_transactions" (
  "id"               TEXT             NOT NULL,
  "sepayId"          BIGINT           NOT NULL,
  "accountNumber"    TEXT             NOT NULL,
  "bankBrandName"    TEXT,
  "transferType"     TEXT             NOT NULL,
  "amountVnd"        INTEGER          NOT NULL,
  "content"          TEXT             NOT NULL,
  "referenceCode"    TEXT,
  "transactionDate"  TIMESTAMP(3)     NOT NULL,
  "receivedAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "matchStatus"      "SepayMatchStatus" NOT NULL DEFAULT 'PENDING',
  "matchedOrderId"   TEXT,
  "matchedAt"        TIMESTAMP(3),
  "matchNotes"       TEXT,
  "rawPayload"       JSONB            NOT NULL,
  CONSTRAINT "sepay_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sepay_transactions_sepayId_key"
  ON "sepay_transactions"("sepayId");

CREATE INDEX "sepay_transactions_accountNumber_transactionDate_idx"
  ON "sepay_transactions"("accountNumber", "transactionDate");

CREATE INDEX "sepay_transactions_matchStatus_receivedAt_idx"
  ON "sepay_transactions"("matchStatus", "receivedAt");

ALTER TABLE "sepay_transactions"
  ADD CONSTRAINT "sepay_transactions_matchedOrderId_fkey"
  FOREIGN KEY ("matchedOrderId") REFERENCES "orders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Liên kết Payment ↔ SepayTransaction (1-1, nullable).
ALTER TABLE "payments" ADD COLUMN "sepayTransactionId" TEXT;

CREATE UNIQUE INDEX "payments_sepayTransactionId_key"
  ON "payments"("sepayTransactionId");

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_sepayTransactionId_fkey"
  FOREIGN KEY ("sepayTransactionId") REFERENCES "sepay_transactions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
