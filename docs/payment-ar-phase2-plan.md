# Kế hoạch: Payment / Công nợ — Phase 2 (Sepay webhook + VietQR)

> Brainstorm chốt 2026-05-24 — triển khai sau khi chọn xong ngân hàng + đăng ký Sepay.
> Ước tính ~1.5 ngày code (webhook + match + unmatched queue + VietQR + bank info config).

## Mục tiêu

Thanh toán **tự động đối soát** thay vì admin/kế toán ngồi check sao kê tay.
Khi khách CK với mã đơn trong nội dung → 10-30s sau payment tự xuất hiện, status đổi
sang PAID, đơn DELIVERED tự CLOSED. Giảm 1 việc lặp đi lặp lại + giảm sai số.

## Quyết định đã chốt (brainstorm 2026-05-24)

| Câu hỏi | Đáp |
|---|---|
| Nhà cung cấp webhook? | **Sepay** (sepay.vn) — free tier 50 tx/tháng để test, gói STARTUP 120k+/tháng prod. |
| Match by? | `code` field do Sepay tự trích từ nội dung CK + normalize 2 chiều (`[^A-Z0-9]/g` → ""). |
| Order code có cần đổi format? | **Không**. Giữ `EZW-2605-0001`, normalize lúc match. |
| VietQR trong Order detail? | **Có** — must-have. Loại bỏ 90% lỗi memo. |
| Trang unmatched queue? | **Có** — `/admin/payments/unmatched`. Đơn giản: list + nút "Gán đơn". |
| Auth webhook? | API Key header (`Authorization: Apikey <KEY>`) + **IP whitelist** Sepay (6 IPv4) ở proxy/middleware. Defense-in-depth. |
| `Payment.recordedById` cho webhook? | **Đổi schema** thành nullable + UI hiển thị "Tự động (Sepay)" khi null. |
| Per-order Virtual Account? | **Defer**. Đắt + KISS-violation. Có VietQR là đủ. |

## So sánh ngân hàng (CHƯA chọn)

> Lưu ý: Sepay hỗ trợ tất cả các ngân hàng lớn. Khác biệt chính là phí CK + ưu đãi
> Sepay + độ phổ biến với khách hàng.

| Ngân hàng | Phí CK in/out | Ghi chú | Phù hợp khi |
|---|---|---|---|
| **MB Bank** | Free all CK | App ổn, SMB favorite, Sepay hỗ trợ tốt | Mặc định an toàn |
| **BIDV** | Free CK <500k | Sepay tặng VIP package (6000 tx/6 tháng) khi mở TK BIDV doanh nghiệp + QR collection | Có ngân sách Sepay-heavy, đơn nhiều |
| **Vietcombank** | Có phí 1 số khoản | 90% người Việt có TK VCB → khách dễ CK | Ưu tiên trải nghiệm khách |
| **Techcombank** | Free all CK | Tương tự MB | Tuỳ ý |

**Khuyến nghị**: MB Bank (default) hoặc BIDV (nếu tận dụng deal Sepay VIP).
Chốt khi mày đã chọn — tao điều chỉnh plan nếu cần.

---

## Thiết kế Schema

### Bảng mới `SepayWebhookEvent` (log + idempotency)
```prisma
model SepayWebhookEvent {
  id            String    @id @default(cuid())
  webhookId     Int       @unique  // Sepay's "id" field — idempotency key
  gateway       String                // "Vietcombank", "MB", ...
  accountNumber String
  transferType  String                // "in" | "out"
  transferAmount Int
  code          String?               // Sepay-extracted memo code
  content       String                // raw memo
  referenceCode String                // bank txn id
  rawPayload    Json                  // toàn bộ payload phòng debug
  receivedAt    DateTime  @default(now())

  // Trạng thái xử lý
  paymentId String?  @unique          // → Payment nếu match thành công
  payment   Payment? @relation(fields: [paymentId], references: [id], onDelete: SetNull)

  matchedOrderId String?
  matchedOrder   Order?  @relation(fields: [matchedOrderId], references: [id], onDelete: SetNull)

  status  WebhookProcessingStatus @default(PENDING)
  // PENDING → vừa nhận; MATCHED → tạo Payment OK; UNMATCHED → không tìm thấy đơn;
  // IGNORED → outflow / amount âm / config bỏ qua; ERROR → exception khi xử lý

  errorMessage String?
  resolvedById String?
  resolvedBy   User?   @relation(fields: [resolvedById], references: [id], onDelete: SetNull)
  resolvedAt   DateTime?

  @@index([status, receivedAt])
  @@map("sepay_webhook_events")
}

enum WebhookProcessingStatus {
  PENDING
  MATCHED
  UNMATCHED
  IGNORED
  ERROR
}
```

### Sửa `Payment` (cho phép null `recordedById`)
- `recordedById String?` (nullable)
- `recordedBy User? @relation(...)` (nullable)
- UI: `recordedBy?.name ?? "Tự động (Sepay)"`

### Sửa `Order`
- Không sửa. Đã có đủ `paidVnd / paymentStatus` từ Phase 1.

### Bảng cấu hình ngân hàng (NEW — siêu nhẹ)
Có 2 cách:
- **A) ENV var thuần** — đơn giản nhất: `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_NAME`, `BANK_CODE` (VietQR code: `BIDV`, `MB`, `VCB`…), `SEPAY_WEBHOOK_API_KEY`. KISS.
- **B) Bảng `BankAccount` 1 row** + UI ADMIN sửa. Linh hoạt hơn nhưng overkill.

Khuyến nghị: **A) ENV**. Chỉ 1 tài khoản, đổi rất hiếm.

### Migration `add_sepay_webhook`
```sql
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('PENDING','MATCHED','UNMATCHED','IGNORED','ERROR');

ALTER TABLE "payments" ALTER COLUMN "recordedById" DROP NOT NULL;

CREATE TABLE "sepay_webhook_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "webhookId" INTEGER NOT NULL,
  "gateway" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "transferType" TEXT NOT NULL,
  "transferAmount" INTEGER NOT NULL,
  "code" TEXT,
  "content" TEXT NOT NULL,
  "referenceCode" TEXT NOT NULL,
  "rawPayload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paymentId" TEXT,
  "matchedOrderId" TEXT,
  "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "sepay_webhook_events_webhookId_key" UNIQUE ("webhookId"),
  CONSTRAINT "sepay_webhook_events_paymentId_key" UNIQUE ("paymentId"),
  CONSTRAINT "sepay_webhook_events_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL,
  CONSTRAINT "sepay_webhook_events_matchedOrderId_fkey"
    FOREIGN KEY ("matchedOrderId") REFERENCES "orders"("id") ON DELETE SET NULL,
  CONSTRAINT "sepay_webhook_events_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE INDEX "sepay_webhook_events_status_receivedAt_idx"
  ON "sepay_webhook_events"("status", "receivedAt");
```

---

## Thiết kế Code

### Endpoint `app/api/sepay/webhook/route.ts`
```ts
// pseudo
export async function POST(req: Request) {
  // 1. IP guard (proxy.ts whitelists Sepay IPs cho path /api/sepay/*)
  // 2. Auth: header Authorization = "Apikey <SEPAY_WEBHOOK_API_KEY>"
  const apiKey = req.headers.get("authorization");
  if (apiKey !== `Apikey ${process.env.SEPAY_WEBHOOK_API_KEY}`) {
    return Response.json({ success: false }, { status: 401 });
  }

  const payload = await req.json();
  // 3. Idempotency — webhookId unique constraint sẽ throw nếu trùng
  try {
    await processSepayWebhook(payload);
  } catch (err) {
    // Lỗi schema/parse → log nhưng VẪN trả 200 cho Sepay (tránh retry 7 lần)
    console.error("[sepay] webhook error", err);
  }
  return Response.json({ success: true });  // ALWAYS 200 sau auth OK
}
```

### `features/sepay/process-webhook.ts` — logic match
```ts
export async function processSepayWebhook(p: SepayPayload) {
  // 1. Try insert event log (unique webhookId → trùng thì skip)
  const event = await prisma.sepayWebhookEvent.create({
    data: { webhookId: p.id, gateway: p.gateway, ..., rawPayload: p,
            status: "PENDING" }
  }).catch((e) => {
    if (isUniqueViolation(e, "webhookId")) return null;  // duplicate
    throw e;
  });
  if (!event) return;  // already processed

  // 2. Bỏ qua outflow
  if (p.transferType !== "in" || p.transferAmount <= 0) {
    return updateEventStatus(event.id, "IGNORED", "Not an inbound payment");
  }

  // 3. Match
  const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const probe = normalize(p.code ?? "") || normalize(p.content ?? "");
  const orders = await prisma.order.findMany({
    where: { deletedAt: null /* + có thể lọc theo prefix EZW */ },
    select: { id: true, code: true, totalFeeVnd: true, paidVnd: true,
              status: true, paymentStatus: true },
  });
  const matched = orders.find((o) => probe.includes(normalize(o.code)));
  if (!matched) {
    return updateEventStatus(event.id, "UNMATCHED", "No matching order");
  }

  // 4. Tránh dup khi admin ghi tay payment có cùng referenceCode
  const dup = await prisma.payment.findFirst({
    where: { orderId: matched.id, reference: p.referenceCode },
  });
  if (dup) {
    return updateEventStatus(event.id, "IGNORED", "Duplicate reference");
  }

  // 5. Tạo Payment + sync (TÁI DÙNG syncOrderPaymentTotals từ Phase 1)
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        orderId: matched.id,
        amountVnd: p.transferAmount,
        method: "BANK_TRANSFER",
        paidAt: new Date(p.transactionDate),
        reference: p.referenceCode,
        notes: p.content.slice(0, 500),
        recordedById: null,  // ← Sepay automated
      },
    });
    await syncOrderPaymentTotals(tx, matched.id);
    await tx.sepayWebhookEvent.update({
      where: { id: event.id },
      data: { status: "MATCHED", paymentId: payment.id, matchedOrderId: matched.id },
    });
  });
}
```

### IP whitelist trong `proxy.ts`
- Thêm rule: nếu path `^/api/sepay/`, chỉ accept IP trong list Sepay 6 IPv4 + 2 IPv6.
- Khi gọi từ Sepay sandbox local cần bypass — dùng env `SEPAY_BYPASS_IP_CHECK=1` cho dev.

### VietQR trong Order detail
- URL pattern: `https://img.vietqr.io/image/<BANK_CODE>-<ACCOUNT>-<TEMPLATE>.jpg?amount=<X>&addInfo=<MEMO>&accountName=<NAME>`
- Template: `compact2` hoặc `qr_only`.
- Component mới `components/shared/vietqr.tsx`:
  ```tsx
  export function VietQR({ amount, memo }: { amount: number; memo: string }) {
    const url = new URL(
      `https://img.vietqr.io/image/${BANK_CODE}-${ACCOUNT}-compact2.jpg`
    );
    url.searchParams.set("amount", String(amount));
    url.searchParams.set("addInfo", memo);
    url.searchParams.set("accountName", ACCOUNT_NAME);
    return <Image src={url.toString()} alt="VietQR" width={300} height={400} unoptimized />;
  }
  ```
- Trong Order detail (chỉ hiển thị khi `paymentStatus !== 'PAID'`):
  - Card "Hướng dẫn thanh toán" — STK + Chủ TK + Ngân hàng + Số còn lại + Memo gợi ý.
  - QR code bên cạnh.
- Memo gợi ý = `Order.code` không dấu (đã được nhấn mạnh "khách cứ scan QR là chuẩn").

---

## Trang `/admin/payments/unmatched`

### Route mới
`app/admin/payments/unmatched/page.tsx` — chỉ ADMIN/STAFF (lọc `requireRole`).

### UI minimal
- Bảng: ngày nhận, ngân hàng, số tiền, memo (`code` + `content`), mã GD bank, badge status.
- Filter: `status = UNMATCHED` mặc định, có thể switch sang ALL/ERROR.
- Mỗi dòng có nút **"Gán đơn"** → mở dropdown chọn `Order.code` (search box) → confirm → tạo Payment, đổi event sang `MATCHED`.
- Nút **"Bỏ qua"** → đổi event sang `IGNORED` (vd: khách bạn bè CK nhầm).

### Action mới
- `resolveUnmatchedToOrder(eventId, orderId)` — ADMIN/STAFF only; transaction tạo Payment + sync + update event.
- `ignoreUnmatched(eventId, reason)` — ADMIN only.

---

## Thay đổi UI hiện có

| File | Việc |
|---|---|
| `app/admin/orders/[id]/page.tsx` | Thêm card "Hướng dẫn thanh toán" + VietQR (chỉ khi chưa PAID). Trong table Payments hiển thị nguồn "Sepay" cho `recordedById = null`. |
| `features/payments/components/payments-table.tsx` | Cột "Người ghi" hiển thị "Tự động (Sepay)" cho null. |
| `lib/nav.ts` | Thêm mục "Thanh toán chưa khớp" trong nav admin (chỉ ADMIN/STAFF), badge số UNMATCHED nếu > 0. |
| `app/admin/dashboard/page.tsx` | (tuỳ chọn) Widget "Thanh toán chưa khớp" — số event UNMATCHED. |

---

## Security

1. **IP whitelist** ở `proxy.ts` cho `^/api/sepay/`. Sepay IPs cố định: 172.236.138.20, 172.233.83.68, 171.244.35.2, 151.158.108.68, 151.158.109.79, 103.255.238.139. Bypass env cho dev.
2. **API Key header** `Authorization: Apikey <KEY>`. Key trong `.env` `SEPAY_WEBHOOK_API_KEY`. Compare với `timingSafeEqual` để chống timing attack.
3. **Idempotency** bắt buộc qua `webhookId @unique`. Nếu Sepay retry 7 lần cùng `id`, chỉ xử lý 1.
4. **Trả 200 sau khi auth OK** — kể cả có lỗi xử lý nội bộ. Vì retry vô ích, lỗi đã log vào `errorMessage`.
5. **Audit log raw payload** (`rawPayload` Json field) — debug + forensic.
6. **Race condition admin-vs-webhook**: check `(orderId, referenceCode)` dup trước khi tạo Payment.
7. **Không trust số tiền < 0 hoặc transferType = out** Phase 2 (đẩy về sau khi có flow refund tử tế).

---

## Test plan

### Sandbox
- Đăng ký `my.dev.sepay.vn` (Sepay sandbox).
- Cấu hình webhook URL = `https://<tunnel>.trycloudflare.com/api/sepay/webhook`.
- Tạo simulated transaction → kiểm tra Payment + Order auto đồng bộ.

### Smoke test (chạy thật sau go-live)
1. Tạo đơn `EZW-XXXX-0001`, totalFee 100,000đ. Mở Order detail, scan VietQR (hoặc CK thủ công với memo `EZWXXXX0001`).
2. Trong 10-30s: refresh Order → thấy Payment mới (recordedBy = "Tự động (Sepay)"), paymentStatus = PAID.
3. CK lần 2 với cùng đơn (cùng `referenceCode`) → KHÔNG tạo Payment thứ 2.
4. CK với memo sai (`XYZ123`) → event vào `/admin/payments/unmatched`.
5. Admin gán tay → Payment tạo, event chuyển MATCHED.

---

## Out of scope Phase 2 (đẩy về sau)

- **Virtual Account per order** — mỗi đơn 1 STK riêng, khách không cần ghi memo.
- **Slack/Zalo notify**: payment về OR unmatched > N.
- **Refund flow tử tế**: `transferType = "out"` tự tạo Payment âm.
- **Reconciliation report**: cuối ngày sao kê Sepay vs DB, báo chênh.
- **Multi-bank**: nhiều TK ngân hàng cùng lúc.
- **Vendor failover**: thử Casso khi Sepay down (premature).

---

## Rủi ro / lưu ý

1. **Sepay downtime**: khách vẫn CK được, admin vẫn ghi Payment tay được (luồng Phase 1 không đụng đến). Không phá vỡ vận hành.
2. **Khách ghi sai memo** → vào unmatched queue, admin gán tay. Cần SOP cho admin check queue 1-2 lần/ngày.
3. **Cùng tham chiếu giao dịch đến 2 lần** (1 từ Sepay, 1 admin ghi nhầm): unique `(orderId, referenceCode)` chặn.
4. **Test ở local**: cần tunnel. Cloudflared free, không cần đăng ký. Hoặc dùng Sepay sandbox.
5. **Phí Sepay**: theo dõi gói. 50tx/tháng free là quá ít cho production — phải lên ít nhất STARTUP (120k/tháng). Lên ngân sách.
6. **VietQR đôi khi khách hết hạn token sao mới khi đổi bank?** Không — `img.vietqr.io` là URL công khai theo `BANK_CODE`. Đổi bank chỉ cần đổi env.
7. **`Order.paymentStatus = PAID` không có nghĩa là tiền đã ngấm vào tài khoản kế toán cuối kỳ** — Sepay báo "tiền về banking" nhưng nếu kế toán cần phân biệt "ghi sổ kế toán doanh nghiệp" thì cần thêm trạng thái. Phase 2 chưa care.

---

## Thứ tự thực hiện đề xuất

1. Chốt ngân hàng + đăng ký Sepay + lấy API Key.
2. ENV vars vào `.env`: `BANK_CODE, BANK_ACCOUNT, BANK_ACCOUNT_NAME, SEPAY_WEBHOOK_API_KEY`.
3. Schema + migration `add_sepay_webhook` (drop NOT NULL trên `Payment.recordedById` + bảng `sepay_webhook_events`).
4. `app/api/sepay/webhook/route.ts` + `features/sepay/process-webhook.ts` + IP whitelist trong `proxy.ts`.
5. VietQR component + card "Hướng dẫn thanh toán" trong Order detail.
6. Cập nhật `payments-table.tsx` để hiển thị "Tự động (Sepay)" cho `recordedById = null`.
7. `/admin/payments/unmatched` page + actions `resolveUnmatchedToOrder` / `ignoreUnmatched`.
8. Nav menu + (optional) dashboard widget.
9. Setup tunnel local + test trên Sepay sandbox.
10. Lint + build + smoke test 5 bước ở phần Test plan.
11. Cập nhật `docs/project-roadmap.md`.

---

## Success metrics

- [ ] CK 1 đơn với memo đúng → Payment xuất hiện trong < 60s, `paymentStatus = PAID`.
- [ ] CK trùng `referenceCode` → KHÔNG tạo Payment dup.
- [ ] Sepay retry 7 lần cùng `webhookId` → bảng `sepay_webhook_events` chỉ có 1 row.
- [ ] CK memo sai → event vào `/admin/payments/unmatched`, admin gán đơn → Payment tạo OK.
- [ ] Webhook không kèm header Authorization đúng → trả 401, không lưu event.
- [ ] Webhook từ IP lạ → 403/404 ở proxy, không vào handler.
- [ ] VietQR trong Order detail scan từ app banking → tất cả field auto điền chuẩn.
- [ ] Sales Portal "Đã thu" + Dashboard "Công nợ" tự cập nhật theo Sepay events.
- [ ] Lint + build pass.
