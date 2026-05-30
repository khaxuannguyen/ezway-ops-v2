# Deploy EZWAY Ops production — Vercel + Neon

## Tổng quan

| Service | Vai trò | Free tier | Paid (khi cần) |
|---|---|---|---|
| **Vercel** | Host Next.js app + edge CDN + SSL | 100GB bandwidth/tháng | $20/tháng Pro |
| **Neon** | Postgres managed (serverless) | 0.5GB DB + 191 compute hours/tháng | $19/tháng + scale |
| **Domain** | URL truy cập (vd `ops.ezway.vn`) | — | ~200k VNĐ/năm (Mắt Bão) |
| **Resend** | Email transactional | 100/day | $20/tháng = 50k/tháng |
| **Sentry** | Error monitoring (optional) | 5k events/tháng | $26/tháng |
| **Upstash Redis** | Rate limit (optional) | 10k commands/day | $0.20/100k |

**Tổng cost first year:** $0-50/tháng (chủ yếu domain).

## Bước 1 — Đăng ký services (1 giờ)

### Vercel
1. https://vercel.com → Sign up với GitHub
2. Authorize Vercel access repo `khaxuannguyen/ezway-ops-v2`
3. **Import Project** → chọn repo → click **Deploy** (sẽ fail vì thiếu DATABASE_URL — OK, fix ở bước 3)

### Neon
1. https://neon.tech → Sign up với GitHub/Google
2. **Create Project**:
   - Name: `ezway-ops-prod`
   - Postgres version: 16
   - Region: **AWS Singapore (ap-southeast-1)** — gần VN nhất
3. Copy **Connection string** (format: `postgresql://user:pass@host/dbname?sslmode=require`)

### Domain (tuỳ chọn nhưng nên có)
- Đăng ký tại [Mắt Bão](https://matbao.net) / [BizFly](https://bizflycloud.vn) / [Cloudflare](https://www.cloudflare.com)
- Recommend: subdomain `ops.ezway.vn` nếu đã có `ezway.vn`. Hoặc mua mới `ezway-ops.com`.

## Bước 2 — Migrate data local lên Neon

```powershell
# 1. Dump local DB (dùng script đã có)
powershell -ExecutionPolicy Bypass -File scripts/backup-local-db.ps1

# 2. Restore lên Neon (thay <NEON_URL> bằng connection string từ Neon dashboard)
# Postgres custom format → cần pg_restore. Dùng Docker để chắc version match Postgres 16.
$NeonUrl = "postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

docker run --rm -v D:\backups\ezway-ops-v2:/backup postgres:16 `
  pg_restore --no-owner --no-acl -d "$NeonUrl" /backup/ezway_LATEST.dump
```

⚠️ **Nếu DB local trống** (chưa có data thật): skip bước migrate, để Vercel build chạy `prisma migrate deploy` tự tạo schema từ migrations.

## Bước 3 — Cấu hình env vars Vercel

Vào Vercel project → **Settings** → **Environment Variables** → add từng cái (Production + Preview + Development):

| Key | Value | Note |
|---|---|---|
| `DATABASE_URL` | `postgresql://...neon.tech/...` | Từ Neon, có `?sslmode=require` |
| `SESSION_SECRET` | Random 32+ chars | `openssl rand -base64 32` — KHÔNG dùng key dev |
| `GOOGLE_CLIENT_ID` | Từ Google Console | Có sẵn |
| `GOOGLE_CLIENT_SECRET` | Từ Google Console | Có sẵn — KHÔNG commit |
| `APP_URL` | `https://ops.ezway.vn` | Domain production |
| `RESEND_API_KEY` | Từ resend.com | Optional, để bật email notify admin |
| `RESEND_FROM_EMAIL` | `no-reply@ezway.vn` | Optional, cần verify domain ở Resend |
| `SEPAY_BANK_ACCOUNT` | `40486` | Khi bật Sepay (đang hoãn vì TCB không support) |
| `SEPAY_BANK_CODE` | `TCB` | |
| `SEPAY_BANK_ACCOUNT_NAME` | `CTY TNHH TM VA DV EZWAY` | |
| `SEPAY_WEBHOOK_API_KEY` | Từ my.sepay.vn | |

## Bước 4 — Cập nhật Google OAuth redirect URI

1. Vào https://console.cloud.google.com → APIs & Services → Credentials
2. Chọn OAuth client của EZWAY
3. **Authorized redirect URIs** → add:
   ```
   https://ops.ezway.vn/api/auth/google/callback
   ```
   (giữ luôn URL `http://localhost:3000/api/auth/google/callback` cho dev)

## Bước 5 — Cấu hình build script Vercel

Vercel mặc định chạy `next build`. EZWAY cần chạy migration trước → cập nhật `package.json`:

```json
{
  "scripts": {
    "build": "prisma migrate deploy && next build",
    "postinstall": "prisma generate"
  }
}
```

(Sẽ làm khi user OK — tao chuẩn bị sẵn task này.)

## Bước 6 — Domain custom

Vercel → project → **Settings** → **Domains** → add `ops.ezway.vn` → Vercel show CNAME record cần add.

Vào DNS provider → add record:
```
Type: CNAME
Name: ops
Value: cname.vercel-dns.com
```

Đợi 5-30 phút SSL auto-issue.

## Bước 7 — Smoke test production

```
✅ https://ops.ezway.vn/login load
✅ Google login → /admin/dashboard
✅ Tạo customer → tạo order → ghi payment
✅ Email notify admin khi unverified user login (nếu RESEND_API_KEY set)
✅ Migrations đã apply (verify Prisma Studio hoặc query database từ Neon dashboard)
```

## Bước 8 — Tạo user thật cho team

1. Login với admin tài khoản đầu tiên
2. `/admin/users/new` → tạo từng NV (email Gmail của họ + role)
3. Gửi link `https://ops.ezway.vn/login` cho team
4. NV bấm "Đăng nhập với Google" — vào ngay (vì đã được invite)

## Monitoring (tuỳ chọn)

### Sentry (recommend)
1. https://sentry.io → free tier
2. Tạo project Next.js → `npx @sentry/wizard@latest -i nextjs`
3. Wizard tự thêm `sentry.client.config.ts` + cập nhật `next.config.ts`
4. Add env `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`

### Rate limit login (recommend cho production)
1. https://upstash.com → tạo Redis free
2. Add env `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
3. Tao implement middleware `@upstash/ratelimit` (cần task riêng — khoảng 1 giờ)

## Disaster recovery

- **Neon point-in-time recovery**: dashboard → branch → restore any time trong 7 ngày (free) / 30 ngày (paid)
- **Local backup**: vẫn chạy daily theo `docs/backup-restore.md` — offline DR
- **Vercel rollback**: dashboard → Deployments → previous → **Promote to Production** (1-click)

## Checklist trước khi go-live

- [ ] DATABASE_URL trỏ Neon (KHÔNG localhost)
- [ ] SESSION_SECRET production random (KHÔNG reuse dev)
- [ ] Google OAuth redirect URI có production URL
- [ ] APP_URL set đúng production domain
- [ ] Smoke test 6 flow chính (login, tạo customer, order, payment, announce, driver portal)
- [ ] Backup local + Neon PITR đều hoạt động
- [ ] Đổi mật khẩu admin (KHÔNG dùng `smoketest123`)
- [ ] Document URL + credentials → ghi vào file an toàn (1Password / Bitwarden)

## Câu hỏi thường gặp

**Q: Vercel có free unlimited không?**
A: Hobby plan miễn phí cho dự án **non-commercial**. EZWAY là internal tool cho công ty → technically vi phạm ToS. Pro $20/tháng để chính thức commercial. Trong thực tế Vercel hiếm enforce với app traffic thấp.

**Q: Data lưu ở Singapore, có vi phạm luật VN không?**
A: Nghị định 53/2022 quy định data người dùng VN của 1 số ngành (MXH, viễn thông) phải lưu tại VN. **Logistics + ops nội bộ chưa nằm trong danh sách bắt buộc**, nhưng nếu muốn safe → chọn VPS VN (Option B).

**Q: Khi nào phải upgrade khỏi free tier?**
A:
- **Vercel:** khi > 100GB bandwidth/tháng (rất khó cho internal 5 user)
- **Neon:** khi > 0.5GB DB (~5-7 năm với volume EZWAY) hoặc > 191 compute hours/tháng (DB auto-suspend khi idle nên ít khi đụng)
- **Resend:** khi > 100 email/day (đủ cho team 5 + notify nội bộ)
