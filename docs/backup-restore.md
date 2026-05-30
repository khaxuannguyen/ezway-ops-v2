# Backup & Restore — EZWAY Ops local Postgres

## Overview

Script `scripts/backup-local-db.ps1` dump Postgres trong Docker container `ezway-postgres` ra file `.dump` (Postgres custom format — compressed, fast restore).

- **Output:** `D:\backups\ezway-ops-v2\ezway_YYYYMMDD_HHmmss.dump`
- **Auto-rotate:** giữ 30 bản gần nhất, xoá cũ
- **Size:** ~80 KB hiện tại, tăng theo data

## Setup chạy tự động hàng ngày (Task Scheduler)

1. Mở **Task Scheduler** (Win+R → `taskschd.msc`)
2. **Action** → **Create Task** (KHÔNG dùng "Create Basic Task" — cần option nâng cao)
3. Tab **General:**
   - Name: `EZWAY Ops daily DB backup`
   - **Run whether user is logged on or not**
   - **Run with highest privileges**
4. Tab **Triggers** → **New:**
   - Daily, lúc `02:00:00`
   - Recur every 1 day
5. Tab **Actions** → **New:**
   - Action: `Start a program`
   - Program/script: `powershell.exe`
   - Add arguments:
     ```
     -NoProfile -ExecutionPolicy Bypass -File "D:\workspace\ezway-ops-v2\scripts\backup-local-db.ps1"
     ```
6. Tab **Conditions:**
   - Bỏ tick "Start the task only if the computer is on AC power" (nếu laptop)
7. **OK** → nhập mật khẩu Windows admin

**Verify:** click chuột phải task → **Run** → check `D:\backups\ezway-ops-v2\` có file mới.

## Chạy tay (test/khẩn cấp)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backup-local-db.ps1
```

## Restore từ backup

⚠️ **Restore sẽ XOÁ data hiện tại** — backup cái mới trước nếu cần.

```powershell
# 1. Copy file backup vào container
docker cp D:\backups\ezway-ops-v2\ezway_20260530_021530.dump ezway-postgres:/tmp/restore.dump

# 2. Restore (--clean --if-exists: xoá object cũ trước khi tạo lại)
docker exec ezway-postgres pg_restore -U postgres -d ezway_ops_v2 --clean --if-exists --no-owner --no-acl /tmp/restore.dump

# 3. Cleanup
docker exec ezway-postgres rm /tmp/restore.dump
```

## Restore vào DB mới (sau disaster)

```powershell
# 1. Tạo container Postgres mới (nếu container cũ chết)
docker run --name ezway-postgres `
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=ezway_ops_v2 `
  -p 5433:5432 -d postgres:16

# 2. Đợi container ready (~5 giây)
Start-Sleep -Seconds 5

# 3. Restore
docker cp D:\backups\ezway-ops-v2\ezway_LATEST.dump ezway-postgres:/tmp/restore.dump
docker exec ezway-postgres pg_restore -U postgres -d ezway_ops_v2 --no-owner --no-acl /tmp/restore.dump
docker exec ezway-postgres rm /tmp/restore.dump
```

## Sau khi deploy production (Vercel + Neon)

- Neon có **point-in-time recovery** built-in (7 ngày free, 30 ngày paid $19/tháng)
- Local backup vẫn nên giữ — disaster recovery offline
- Optional: thêm cron upload backup lên Cloudflare R2 / Google Drive

## Câu hỏi thường gặp

**Q: File `.dump` mở bằng gì?**
A: Custom format — không đọc tay. Restore qua `pg_restore`. Nếu muốn plain SQL: `pg_restore -f output.sql backup.dump`.

**Q: Backup khi Docker container đang chạy có an toàn không?**
A: Có. `pg_dump` là online backup, tạo consistent snapshot không lock table dài.

**Q: Disk D: hỏng thì sao?**
A: Mất hết. **Phải sync `D:\backups\` lên cloud storage** (OneDrive / Google Drive / R2). Hoặc deploy production sớm.
