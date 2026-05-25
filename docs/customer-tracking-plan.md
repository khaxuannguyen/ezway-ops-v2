# Kế hoạch: Customer Tracking + EzPost branded view

> Brainstorm chốt 2026-05-24 — code SAU khi xong Pickup status history.
> Ước tính ~3-5 ngày tuỳ scope MVP / có KSN API hay không.

## Mục tiêu

Khách hàng EZWAY mở 1 URL ngắn → thấy trạng thái đơn realtime, **brand EzPost
hoàn toàn** (không thấy KSN/Go). Giảm tin nhắn/cuộc gọi "đơn tôi đến đâu rồi?"
+ bảo vệ thương hiệu (đối thủ không biết ta dùng carrier nào).

---

## Quyết định đã chốt (brainstorm 2026-05-24)

| Câu hỏi | Đáp |
|---|---|
| Access model | Public link với token 32 ký tự — không cần login. SOP: gửi link cho khách qua Zalo/SMS sau khi tạo đơn. |
| Token đoán không ra | Có. `crypto.randomBytes(16).toString("hex")` — 128-bit entropy. |
| Stack tracking source | **3 nguồn gộp**: (1) PickupStatusLog nội bộ, (2) Order.status changes, (3) Carrier 3rd party (KSN có API, Go manual). |
| Scrape HTML carrier? | **KHÔNG**. Fragile. |
| Aggregator (AfterShip/Trackingmore)? | Defer. KSN đã có API riêng, Go còn manual đủ KISS lúc đầu. |
| Public page rebrand | "EzPost Tracking" — không hiển thị tên KSN/Go ở UI khách. Internal admin vẫn thấy. |

---

## Schema

### Bảng mới `Order` thêm tracking token
```prisma
model Order {
  // ... existing fields
  publicTrackingToken String? @unique  // gen lúc tạo order; null = chưa public
  // ...
}
```

### Bảng mới `OrderCarrierTracking` (1 đơn có thể 0..N carrier — sau này hỗ trợ multi-leg)
```prisma
model OrderCarrierTracking {
  id            String          @id @default(cuid())
  orderId       String
  order         Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  carrierCode   String                     // "KSN", "GO", "MANUAL", "EZWAY_SELF"
  carrierName   String                     // "KSNPost", "GoPost", ... (chỉ admin thấy)
  externalTrackingNumber String              // mã track bên carrier
  externalTrackingUrl    String?             // link gốc carrier (admin xem)

  // Status cuối cùng (cache cho query nhanh)
  lastStatus       String?           // EZWAY-normalized status, vd "IN_TRANSIT"
  lastStatusLabel  String?           // hiển thị khách: "Đang vận chuyển nội địa"
  lastSyncedAt     DateTime?
  lastSyncError    String?

  events           CarrierTrackingEvent[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([orderId])
  @@index([carrierCode, externalTrackingNumber])
  @@map("order_carrier_trackings")
}

model CarrierTrackingEvent {
  id               String                @id @default(cuid())
  trackingId       String
  tracking         OrderCarrierTracking  @relation(fields: [trackingId], references: [id], onDelete: Cascade)
  occurredAt       DateTime
  status           String                 // EZWAY-normalized
  statusLabel      String                 // hiển thị khách
  location         String?                // "Hà Nội", "Đà Nẵng"
  description      String?                // chi tiết
  rawData          Json?                  // payload gốc từ carrier (debug)

  createdAt DateTime @default(now())
  @@index([trackingId, occurredAt])
  @@map("carrier_tracking_events")
}
```

### Migration `add_customer_tracking`
- `Order.publicTrackingToken` nullable + unique.
- 2 bảng mới `order_carrier_trackings` + `carrier_tracking_events`.
- Backfill: gen token cho mọi Order hiện có.

### Lưu ý normalize status
Mỗi carrier có status code riêng. Ta map về **EZWAY-normalized status enum**:
```
PENDING            (chờ pickup carrier)
PICKED_UP          (carrier đã nhận hàng)
IN_TRANSIT         (đang vận chuyển)
AT_LOCAL_HUB       (đến hub gần)
OUT_FOR_DELIVERY   (đang giao)
DELIVERED          (đã giao)
FAILED             (giao thất bại)
RETURNED           (trả về)
EXCEPTION          (sự cố)
```

Map table per-carrier ở `lib/tracking/carriers/<carrier>.ts`.

---

## Kiến trúc Carrier Adapter

### Interface chung
```ts
// lib/tracking/types.ts
export interface CarrierAdapter {
  code: string;            // "KSN", "GO", "MANUAL"
  name: string;
  fetchStatus(trackingNumber: string): Promise<CarrierFetchResult>;
}

export interface CarrierFetchResult {
  ok: boolean;
  errorMessage?: string;
  lastStatus: string;          // normalized
  lastStatusLabel: string;
  events: {
    occurredAt: Date;
    status: string;
    statusLabel: string;
    location?: string;
    description?: string;
    rawData?: unknown;
  }[];
}
```

### Adapter `KSN` (cần docs API từ mày khi code)
```ts
// lib/tracking/carriers/ksn.ts
export const ksnAdapter: CarrierAdapter = {
  code: "KSN",
  name: "KSNPost",
  async fetchStatus(trackingNumber: string) {
    const res = await fetch(`${KSN_API_BASE}/tracking/${trackingNumber}`, {
      headers: { "Authorization": `Bearer ${process.env.KSN_API_KEY}` },
    });
    if (!res.ok) return { ok: false, errorMessage: `KSN ${res.status}`, ... };
    const data = await res.json();
    return {
      ok: true,
      lastStatus: mapKsnStatus(data.currentStatus),
      lastStatusLabel: NORMALIZED_LABELS[mapKsnStatus(data.currentStatus)],
      events: data.history.map((h) => ({
        occurredAt: new Date(h.timestamp),
        status: mapKsnStatus(h.status),
        statusLabel: NORMALIZED_LABELS[mapKsnStatus(h.status)],
        location: h.location,
        description: h.note,
        rawData: h,
      })),
    };
  },
};
```
*Note*: Khi code thật, mày gửi docs KSN qua, tao fill exact endpoints + mapping.

### Adapter `MANUAL` (cho Go + bất kỳ carrier không API)
- Không fetch tự động.
- Admin/STAFF mở `/admin/orders/[id]` → tab "Tracking" → nhập tay status hiện tại + thêm sự kiện vào timeline.
- Lưu thẳng vào `CarrierTrackingEvent`.

### Registry
```ts
// lib/tracking/registry.ts
import { ksnAdapter } from "./carriers/ksn";

export const CARRIER_ADAPTERS: Record<string, CarrierAdapter> = {
  KSN: ksnAdapter,
  // GO: goAdapter,   // thêm khi có API
};

export function getAdapter(carrierCode: string): CarrierAdapter | null {
  return CARRIER_ADAPTERS[carrierCode] ?? null;
}
```

### Sync logic
- **On-demand**: khi customer mở `/track/<token>` → nếu `lastSyncedAt > 60s trước` → trigger fetch. Đảm bảo fresh.
- **Background** (Phase sau): cron mỗi 30 phút quét tracking active (chưa DELIVERED/RETURNED) → fetch lại.
- **Failure handling**: nếu fetch fail → giữ data cũ + log `lastSyncError` + KHÔNG break customer view.

---

## Public tracking page `/track/[token]`

### Route
`app/track/[token]/page.tsx` — **PUBLIC**, không cần login, KHÔNG đi qua `/admin/*` layout.

### Security
- Token unique 32 hex chars → khôg brute force được.
- Rate limit per IP: 60 req/phút (tránh DoS).
- KHÔNG có "search" UI bằng số đơn / SĐT — chỉ token-only.
- KHÔNG expose dữ liệu nhạy cảm: KHÔNG name khách hàng, SĐT, địa chỉ chi tiết, giá cước, lợi nhuận, profit, recordedBy, salesUser, internal notes. CHỈ:
  - Mã đơn (đã là public-safe vì khách biết)
  - Trạng thái + timeline
  - Service name (vd "Express US-VN")
  - Số kiện + tổng cân (đã là khách biết)
  - Số tiền tổng cước (cái này khách đã biết)
  - Địa chỉ giao **quận/thành phố** thôi (không nhà số) — *quyết định khi code*

### UI
- Header: "EzPost Tracking" — logo + tagline.
- Cụm to: mã đơn + status badge (label tiếng Việt).
- Timeline dọc: events theo thứ tự ngược (mới nhất trên), icon theo status, location + description.
- Estimated delivery (nếu carrier trả) — defer.
- Helper: "Nếu có thắc mắc, liên hệ: <hotline EZWAY>".
- KHÔNG hiển thị tên KSN/Go ở đâu cả — UI chỉ thấy "EzPost".

### Trang xử lý token sai/hết hạn
- 404 trang đẹp: "Mã tra cứu không hợp lệ hoặc đã hết hạn."
- Optional: revoke token (set null) khi cần (admin action) — defer.

---

## Admin UI tích hợp

### `app/admin/orders/[id]/page.tsx` thêm card "Tracking"
- Hiển thị `publicTrackingToken` + nút COPY public URL → `https://ezway.com/track/<token>`.
- Nút "Tạo lại token" (revoke + gen mới) — phòng leak.
- List `OrderCarrierTracking`:
  - Carrier name (admin thấy, vd "KSNPost")
  - Mã track bên carrier
  - Link gốc carrier (admin tự click khi cần)
  - Last status + last synced at
  - Nút "Sync ngay" (gọi adapter manually)
- Nút "+ Thêm tracking carrier" → modal: chọn carrier + nhập tracking number.
- Nếu carrier = MANUAL: thêm nút "+ Sự kiện mới" → form: ngày, status, location, description.

### Permissions
- ADMIN/STAFF: thêm/sửa/xoá tracking, sync, copy public link.
- SALE: thấy public link để gửi khách, KHÔNG sửa.
- Customer (qua public link): chỉ đọc.

---

## Aggregate timeline trên public page

Public page gộp 3 nguồn:

1. **Order status changes** — log lúc Order chuyển CONFIRMED → IN_TRANSIT → DELIVERED... (cần thêm `OrderStatusLog` bảng tương tự `PickupStatusLog` — OR tận dụng `AuditLog`).
2. **PickupStatusLog** — pickup carrier (tài xế EZWAY) trạng thái: PENDING, ASSIGNED, ON_THE_WAY, PICKED_UP.
3. **CarrierTrackingEvent** — carrier 3rd party 1 (KSN, qua API) + carrier manual (Go, qua tay).

Sort theo `occurredAt` desc → 1 dòng timeline duy nhất cho khách.

**Tip**: làm helper `buildPublicTimeline(orderId)` trong `features/tracking/queries.ts` → return `TrackingEvent[]` đã gộp + sort.

---

## Gửi link tracking cho khách

### Manual (MVP)
- Admin copy link từ Order detail → paste vào Zalo/SMS gửi khách.

### Auto (Phase 2 — defer)
- Tích hợp Zalo OA / SMS gateway → tự gửi link khi Order CONFIRMED.
- Cần đăng ký Zalo Official Account + budget gửi SMS (~250-500đ/tin).

---

## Out of scope (defer / skip)

- ❌ Scrape HTML carrier không có API — KHÔNG bao giờ.
- ❌ Aggregator (AfterShip/Trackingmore) — defer đến khi có >100 carrier hoặc volume >100 đơn/ngày.
- ❌ Mobile app riêng cho khách — web responsive đủ.
- ❌ Push notification (web push, FCM) — defer.
- ❌ Multi-language (EN tracking page) — defer.
- ❌ Estimated delivery date AI predict — defer.
- ❌ Tracking via SMS keyword — defer.

---

## Risk + lưu ý

1. **Token leak**: nếu khách share link công khai (FB, group...) → ai cũng xem được status đơn đó. Phase 1: chấp nhận. Phase sau có thể thêm "verify SĐT 4 số cuối" làm bước thứ 2.
2. **Carrier API thay đổi**: viết adapter modular + version check. Set up monitoring: nếu sync rate fail > 20% trong 1h → alert admin.
3. **Rate limit khách F5 spam**: per-IP rate limit cứng (Upstash Redis hoặc in-memory LRU đơn giản).
4. **DoS qua public endpoint**: rate limit toàn cục cho `/track/*` ở proxy.ts.
5. **Privacy leak**: review kỹ field nào expose qua API public. Test với 1 đồng nghiệp xem trang khách → list ra cái không nên thấy.
6. **Lag tracking** (carrier chưa cập nhật): có thể khách thấy status cũ 1-2 ngày. Hiển thị "Cập nhật lần cuối: 15:30 24/05" cho rõ.
7. **Token bị brute force**: 128-bit entropy = 3.4×10^38 → an toàn. Nhưng vẫn rate limit để chống scan.
8. **Mất link**: khách báo "mất link" → admin vào Order detail copy lại gửi. Hoặc đề xuất "regenerate" nếu nghi leak.

---

## Thứ tự thực hiện đề xuất

### Phase MVP (~3 ngày)
1. Schema + migration `add_customer_tracking` (`publicTrackingToken` + 2 bảng).
2. Backfill token cho Order hiện có.
3. Action `createOrder` + `createCustomer` cập nhật để gen token.
4. `lib/tracking/` — types + registry + adapter MANUAL.
5. `features/tracking/actions.ts` + `queries.ts` — buildPublicTimeline, addEvent, addCarrierTracking.
6. Admin UI: card Tracking trong `/admin/orders/[id]` + form add carrier + form add manual event.
7. Public page `/track/[token]/page.tsx` + components branded.
8. Rate limit middleware cho `/track/*` (basic in-memory hoặc Upstash).
9. Lint + build + smoke test với 1 đơn fake.

### Phase 2 (~2 ngày) — sau khi mày đã gửi tao KSN API docs
1. Adapter `KSN` (`lib/tracking/carriers/ksn.ts`) với endpoint + status mapping thật.
2. On-demand sync khi mở public page (TTL 60s).
3. Background cron sync mỗi 30 phút (Vercel cron / setInterval cron lib).
4. UI admin: badge "Synced ago", nút "Sync ngay".
5. Test full flow với 1 mã KSN thật.

### Phase 3 (defer) — Go + carriers khác
- Thêm GO adapter khi GO cho API HOẶC giữ MANUAL.
- Aggregator AfterShip nếu volume tăng vọt.

---

## Success metrics

- [ ] Tạo Order mới → `publicTrackingToken` tự gen + URL public copy được.
- [ ] Mở URL public → thấy timeline EZWAY-branded, KHÔNG thấy "KSN" / "GoPost" ở đâu cả.
- [ ] Admin add KSN tracking + nhập mã thật → Phase 2 fetch về events, hiển thị trong timeline.
- [ ] Admin add MANUAL tracking + nhập event tay → hiển thị trong timeline.
- [ ] Token sai → trang 404 đẹp, không leak gì.
- [ ] Token đúng nhưng order CANCELLED → vẫn xem được status (đã huỷ).
- [ ] SALE thấy public link, KHÔNG thấy nút sửa/sync.
- [ ] Customer xem timeline → KHÔNG thấy SĐT, tên người, địa chỉ chi tiết, profit, salesUser.
- [ ] Rate limit hoạt động: 100 req/phút từ 1 IP → bị 429.
- [ ] Lint + build pass.

---

## Phụ thuộc / open questions

1. **KSN API docs**: cần mày gửi tao docs (endpoint, auth, response shape, status enum) khi đến Phase 2.
2. **GoPost**: confirm họ KHÔNG có API → giữ MANUAL. Nếu sau này có → thêm adapter.
3. **Hosting**: rate limit in-memory (Next.js process) đủ cho VPS 1 instance. Nếu serverless multi-region (Vercel) → cần Upstash Redis.
4. **Domain customer-facing**: dùng chung `ezway.com/track/...` hay subdomain `track.ezway.com`? Quyết định khi go-live.
5. **EzPost branding**: cần asset (logo, color, tagline) — mày cung cấp khi code public page.
