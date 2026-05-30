-- Login attempts từ Google của email chưa được mời (invite-only).
-- Admin xem ở /admin/pending-invites + tạo TK ngay hoặc bỏ qua.

CREATE TYPE "LoginAttemptStatus" AS ENUM ('PENDING', 'INVITED', 'IGNORED');

CREATE TABLE "login_attempts" (
  "id"             TEXT                NOT NULL,
  "email"          TEXT                NOT NULL,
  "name"           TEXT,
  "picture"        TEXT,
  "googleSub"      TEXT,
  "ipAddress"      TEXT,
  "userAgent"      TEXT,
  "attemptedAt"    TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attemptCount"   INTEGER             NOT NULL DEFAULT 1,
  "lastNotifiedAt" TIMESTAMP(3),
  "status"         "LoginAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "resolvedAt"     TIMESTAMP(3),
  "resolvedById"   TEXT,
  CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_attempts_status_attemptedAt_idx"
  ON "login_attempts"("status", "attemptedAt");

CREATE INDEX "login_attempts_email_idx"
  ON "login_attempts"("email");

ALTER TABLE "login_attempts"
  ADD CONSTRAINT "login_attempts_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
