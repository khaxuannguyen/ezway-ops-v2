-- Module thông báo nội bộ — ADMIN đăng, NV đọc.

CREATE TABLE "announcements" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "visibleToRoles" "UserRole"[] DEFAULT ARRAY[]::"UserRole"[],
  "authorId" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON UPDATE CASCADE
);
CREATE INDEX "announcements_publishedAt_idx" ON "announcements"("publishedAt");
CREATE INDEX "announcements_isPinned_publishedAt_idx" ON "announcements"("isPinned", "publishedAt");

CREATE TABLE "announcement_reads" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "announcementId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "announcement_reads_announcementId_userId_key" UNIQUE ("announcementId", "userId"),
  CONSTRAINT "announcement_reads_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "announcement_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "announcement_reads_userId_readAt_idx" ON "announcement_reads"("userId", "readAt");
