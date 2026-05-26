# Kế hoạch: Forwarder Processing Workflow — Cắt double-entry sang Kango/KSN/Go

> Brainstorm chốt 2026-05-26 — REPLACE plan customs-collection (đã archive).
> Volume hiện tại: 20-50 đơn/ngày. Pain map: ADMIN tốn 1-2h/ngày copy paste 25-40 ô per đơn từ EZWAY sang portal Kango/KSN/Go.
> Ước tính ~4-5 ngày code cho Phase A (KISS, không cần API).

## Bối cảnh

Workflow thực tế của EZWAY:
1. **SALE** tạo đơn ở app EZWAY (đã có).
2. **ADMIN** nhìn đơn của SALE → mở portal chuyên tuyến (Kango/KSN/Go) → khai báo TAY lại 25-40 ô → submit → lấy tracking number → quay về EZWAY paste tracking + đánh dấu "đã đẩy".
3. **Customer** track qua link EZWAY → EZWAY gọi API tracking của chuyên tuyến.

**Constraint quan trọng**: các bên chuyên tuyến **chỉ có API LẤY tracking, KHÔNG có API khai báo hàng**. Phải submit qua web portal tay.

## Quyết định kiến trúc (đã chốt)

| Câu hỏi | Đáp |
|---|---|
| API push shipment sang carrier? | **KHÔNG có**. Carriers chỉ cho API tracking. |
| Browser automation (Playwright auto-fill portal)? | **Defer**. Fragile + nguy cơ bot detection ban account. Phase D nếu volume >100/ngày. |
| Approach Phase A? | **Copy-assist** — UI EZWAY hiển thị data đã structure khớp form Kango, ADMIN click copy từng cụm, paste sang portal. Giảm 50-70% time. |
| Tách Receiver ra khỏi Customer? | **Có**. Khách EZWAY (sender) ≠ recipient (Kango Receiver). Nhiều đơn của 1 khách có thể gửi cho nhiều người nhận khác nhau. |
| Customs HS code / restricted items engine? | **KHÔNG**. Carriers lo. Plan customs-collection đã archive. |
| Invoice items model (cho khai báo Goods Details)? | **Có, basic**: description / quantity / unit / price / total. KHÔNG HS code, KHÔNG restricted check. |
| Multi-carrier copy layout? | **Phase A: 1 layout chung** (Kango format). Phase B thêm KSN/Go custom mapping nếu khác form. |
| Tự push tracking ngược về EZWAY? | **Tracking module Phase 2** sẽ auto poll qua carrier API. Phase A: admin paste tracking tay sau khi đẩy. |

## Pain points & ROI

| Pain | Hiện tại | Sau Phase A | ROI |
|---|---|---|---|
| Admin nhập 25-40 ô/đơn | 5-10 phút/đơn | 1-2 phút/đơn (chỉ click copy + paste) | 🔴🔴🔴 |
| Admin theo dõi "đơn nào đã đẩy chưa" | Trí nhớ / Excel ngoài | Queue UI có badge | 🔴🔴 |
| Tracking number về EZWAY | Paste tay 1 lần | Paste tay 1 lần (Phase A); auto poll (Phase 2 Tracking) | 🔴 |
| Receiver thông tin sai lệch giữa EZWAY và Kango | Có (copy nhầm) | Source of truth = EZWAY | 🔴🔴 |

20-50 đơn × 5-10 phút = **2-8h/ngày admin**. Cắt xuống 1-2 phút/đơn = **30-100 phút/ngày**. **Tiết kiệm thật 1-7h/ngày admin.**

---

## Schema design

### Bảng mới `Recipient` (người nhận quốc tế)
```prisma
model Recipient {
  id          String  @id @default(cuid())
  customerId  String?                 // optional: thuộc khách hàng EZWAY nào (nếu khách gửi cho cùng người nhận nhiều lần)
  customer    Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)

  companyName String?                 // optional
  contactName String                  // bắt buộc
  phone       String
  email       String?

  country     String                  // ISO code "US", "DE", "GB", "CA", "AU", ...
  stateProvince String?               // California, NSW, Bayern...
  city        String
  postalCode  String                  // ZIP / postcode
  addressLine1 String
  addressLine2 String?
  addressLine3 String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  orders      Order[]

  @@index([customerId])
  @@index([phone])
  @@map("recipients")
}
```

**Note**: tách khỏi `Customer` (sender) — 1 sender có thể gửi cho N recipients. Tái dùng recipient cũ khi khách gửi lại cùng người.

### Bảng mới `InvoiceItem` (khai báo hàng — basic)
```prisma
model InvoiceItem {
  id          String  @id @default(cuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)

  description String                  // "Quần áo nữ", "Phụ kiện điện thoại", "Sách"
  quantity    Int     @default(1)
  unit        String  @default("Pcs") // Pcs / Set / Pair / Box / ...
  unitPriceUsd Decimal @db.Decimal(10, 2)
  totalValueUsd Decimal @db.Decimal(10, 2)  // = quantity × unitPriceUsd

  createdAt   DateTime @default(now())

  @@index([orderId])
  @@map("invoice_items")
}
```

**Note**: KHÔNG HS code, KHÔNG hazardous flag. Khi chuyển sang Phase "trực tiếp hãng bay" (sau này), upgrade schema thêm fields.

### `Order` mở rộng
```prisma
model Order {
  // ... existing fields

  // Recipient quốc tế (tách khỏi Customer)
  recipientId         String?
  recipient           Recipient? @relation(fields: [recipientId], references: [id], onDelete: SetNull)

  // Khai báo invoice
  customsExportType   CustomsExportType @default(GIFT) // GIFT / MERCHANDISE / DOCUMENTS / SAMPLE / RETURN
  totalDeclaredValueUsd Decimal? @db.Decimal(12, 2)    // = sum InvoiceItem.totalValueUsd
  invoiceItems        InvoiceItem[]

  // Forwarder processing state
  carrierForwardedAt    DateTime?     // null = chưa đẩy lên chuyên tuyến
  carrierForwardedById  String?
  carrierForwardedBy    User?         @relation("OrderForwardedBy", fields: [carrierForwardedById], references: [id], onDelete: SetNull)
  carrierCode           String?       // "KANGO" / "KSN" / "GO"
  carrierTrackingNumber String?       // mã do chuyên tuyến trả sau khi khai báo
  carrierReferenceCode  String?       // reference code/internal ID của chuyên tuyến (nếu có)
  carrierNote           String?       // ghi chú admin (ví dụ: "đẩy qua nhóm Zalo", "Kango chậm")

  // Service tier (cho Kango: "Chuyên tuyến" vs "Express"...)
  serviceTier         String?         // tự do nhập, vd "Chuyên tuyến", "Express", ...
  requiresSignature   Boolean @default(false)
  branchCode          String?         // "HCM", "HN" — chi nhánh xử lý
}

enum CustomsExportType {
  GIFT
  MERCHANDISE
  DOCUMENTS
  SAMPLE
  RETURN
}
```

### Migration `add_forwarder_processing`
- Thêm `recipients`, `invoice_items`, `CustomsExportType` enum, cột mới trên Order.
- Backfill: tạo `Recipient` từ `Customer` cho order cũ (best-effort copy phone/address — manual fix sau).
- Add User relation `forwardedOrders Order[] @relation("OrderForwardedBy")`.

---

## Phase A — Schema + Form mở rộng + Copy Assist (~4-5 ngày)

### Tasks

#### A1. Schema + migration (~0.5 ngày)
- Apply migration.
- Backfill old orders: set `carrierForwardedAt = updatedAt` cho status DELIVERED/CLOSED (giả định đã đẩy).

#### A2. Form Sale tạo/sửa đơn — thêm 2 section (~1.5 ngày)
- **Section "Người nhận"**:
  - Dropdown "Chọn người nhận cũ" filter theo customer.
  - Nếu chọn cũ → auto-fill các field.
  - Nếu thêm mới → form đầy đủ: company, contact name, phone, email, country (ISO dropdown), state/province (text — bỏ "Mở danh sách khu vực" phức tạp), city, postal, addr 1-3.
  - Checkbox "Lưu thông tin người nhận" → save vào `Recipient`.
- **Section "Khai báo Invoice"**:
  - Dropdown `customsExportType` (Gift/Merchandise/Documents/Sample/Return).
  - Repeater `InvoiceItem`: description / quantity / unit (dropdown Pcs/Set/Pair/Box) / unit price USD / total auto-calc.
  - Tổng `totalDeclaredValueUsd` tính tự động.
- Form validation server-side: nếu đơn `status` ≠ DRAFT/CANCELLED → bắt buộc có `recipient` + ≥1 `invoiceItem`.

#### A3. Admin processing queue page (~0.5 ngày)
- Route mới `/admin/processing` (ADMIN/STAFF only).
- Table: list đơn `carrierForwardedAt IS NULL AND status NOT IN (DRAFT, CANCELLED)`, sort theo `createdAt DESC`.
- Cột: mã đơn / khách / dịch vụ / số kiện / tổng giá khai / người nhận (tên + nước) / sale / ngày tạo / actions.
- Badge "Cần xử lý" với số đơn pending trong sidebar nav.
- Filter: theo sale, dịch vụ, country.

#### A4. "Copy to Carrier Portal" helper UI (~1.5-2 ngày)
- Mở từ Order detail (nếu chưa forwarded) hoặc từ queue page.
- Modal/sidebar full-screen với layout mirror Kango portal:
  - **Người gửi (Sender)**: hardcode info EZWAY company từ env. Button "Copy".
  - **Người nhận (Receiver)**: hiển thị từng field (company / contact / phone / country / state / city / postal / address). Mỗi field có button click-to-copy (clipboard) + tooltip "Đã copy".
  - **Thông tin đơn hàng**: service tier / signature / branch / reference (= EZWAY order code). Click to copy.
  - **Kiện hàng**: bảng từng kiện L×W×H/weight. Button "Copy as table" (CSV/TSV → Excel paste OK).
  - **Khai báo Invoice**: bảng goods details / quantity / unit / price / total. Button "Copy as table".
- Footer: form nhập kết quả sau khi admin đã xong khai báo bên Kango:
  - Carrier code dropdown (KANGO / KSN / GO / OTHER + custom).
  - External tracking number input.
  - Reference code (nếu có).
  - Note (tuỳ chọn).
  - Button **"Đánh dấu đã đẩy"** → action:
    - Set `Order.carrierForwardedAt = now()`, `carrierForwardedById = actor.id`, `carrierCode`, `carrierTrackingNumber`, `carrierReferenceCode`, `carrierNote`.
    - Tạo `OrderCarrierTracking` entry (reuse tracking module schema khi có).
    - Revalidate paths.
- Phím tắt cho power user: `Ctrl+Shift+C` mở Copy Helper từ Order detail.

#### A5. UX polish (~0.5 ngày)
- Order detail card "Đã đẩy carrier": hiển thị carrier code, tracking number link (external), forwarded by user + time.
- Button "Bỏ đánh dấu" (ADMIN only) — set `carrierForwardedAt = NULL` (đôi khi admin sai cần redo).
- Action role: ADMIN/STAFF được mark forwarded; SALE chỉ xem.

---

## Phase B — Multi-carrier copy layouts (~1-2 ngày)

> Làm sau khi Phase A chạy thật 1-2 tuần, biết carrier nào cần layout riêng.

- Mỗi carrier (KSN, Go) có thể có form layout khác Kango. Define mapping table:
  - VD KSN có thể tên field là "Receiver Name" thay vì "Contact Name".
  - VD Go có thể không có "Branch", có "Service Type" với enum riêng.
- Component `<CarrierCopyHelper carrier="KANGO|KSN|GO" />` render layout phù hợp.
- Mapping config trong code (file `lib/carriers/<code>.ts`) — không cần DB.

---

## Phase C — Browser automation (defer, chỉ khi volume >100/ngày)

> Risk cao + có thể vi phạm ToS carrier. Cân nhắc kỹ.

- Playwright/Puppeteer chạy headless trên VPS riêng.
- Worker queue (BullMQ + Redis).
- Đẩy data EZWAY → fill form Kango → submit → đọc tracking number trả về.
- **Cảnh báo**: carrier có thể detect bot, ban account → workflow chính bị tê liệt. Có fallback manual.

---

## Phase D — Auto-poll tracking về EZWAY (tracking module Phase 2)

> Đã plan ở `docs/customer-tracking-plan.md`. Khi `carrierTrackingNumber` đã có → tracking module Phase 2 cron 30 phút gọi API carrier → cập nhật status timeline cho khách track.

---

## Out of scope

- ❌ HS code engine + restricted items
- ❌ IOSS / VAT collection
- ❌ Commercial invoice PDF auto-gen (carrier xuất bản)
- ❌ EORI / customs filing
- ❌ Multi-currency declared value (USD đủ — carrier convert)
- ❌ Photo của hàng (defer; có model `PickupPhoto`)

---

## Rủi ro / lưu ý

1. **Backfill Recipient từ old Customer**: thông tin Customer hiện chỉ có name/phone/address (1 dòng) — không đủ cho international shipping. Đơn cũ vẫn dùng được nhưng admin có thể fail khi đẩy lên Kango nếu thiếu postal/state. Mitigation: tool admin batch-fill recipient cho đơn pending.
2. **Clipboard API browser support**: Chrome/Edge OK; Firefox có thể prompt permission. Test trên browser admin dùng thực tế.
3. **Carrier portal đổi UI**: copy assist không phụ thuộc UI carrier (chỉ structured data clipboard) → an toàn so với automation.
4. **Sale nhập thiếu Recipient/InvoiceItem**: validation server-side bắt buộc trước CONFIRMED. UI warning rõ.
5. **Đánh dấu "đã đẩy" sai**: ADMIN bấm nhầm → mất queue. Có nút "Bỏ đánh dấu" để revert.
6. **Multi-user concurrency**: 2 ADMIN cùng xử lý 1 đơn → 2 lần đẩy lên Kango = 2 tracking number trùng. Mitigation: optimistic lock (check `carrierForwardedAt` IS NULL trước update); show "Đang xử lý bởi NV X" nếu cần.
7. **Country/State data**: nhiều nước có state list dài (US 50, AU 8, CA 13). Phase A dùng text input đơn giản (admin chịu nhập tay). Phase B+ thêm dropdown nếu cần.

---

## Thứ tự thực hiện

1. **A1 Schema + migration** (0.5 ngày)
2. **A2 Form Sale mở rộng** Receiver + InvoiceItem (1.5 ngày)
3. **A3 Admin processing queue** (0.5 ngày)
4. **A4 Copy Helper modal** (1.5-2 ngày) ← core feature
5. **A5 UX polish** + Order detail card "Đã đẩy" (0.5 ngày)
6. Update roadmap + lint + build + smoke test 5 scenario:
   - Tạo Recipient mới
   - Reuse Recipient cũ
   - Tạo đơn với 3 invoice items, tổng giá auto
   - Admin processing queue → copy helper → mark forwarded → check Order detail có badge "Đã đẩy KANGO #XXX"
   - Bỏ đánh dấu → quay lại queue

Phase B-D defer tới khi cần thật.

---

## Success metrics

- [ ] SALE tạo 1 đơn quốc tế: chọn Recipient cũ (auto-fill 9 field) + nhập 3 invoice items → tổng `totalDeclaredValueUsd` tính đúng.
- [ ] Admin mở `/admin/processing` → thấy queue đơn pending sort theo ngày.
- [ ] Click vào đơn → mở Copy Helper → từng field copy được vào clipboard (verify ngoài notepad).
- [ ] Paste data vào Kango portal (real-world test): 25-40 ô fill chỉ với ~5-10 click thay vì gõ tay.
- [ ] Sau khi Kango trả tracking → admin paste vào "Tracking number" + click "Đánh dấu đã đẩy".
- [ ] Order detail: card "Đã đẩy KANGO" với tracking + người + thời gian.
- [ ] Queue update: đơn đó biến mất khỏi pending.
- [ ] SALE thấy Order vẫn có thể xem tracking nhưng không sửa được state forwarded.
- [ ] Time đo thực tế (test với 5 đơn): trung bình 1-2 phút/đơn so với 5-10 phút trước.
- [ ] Lint + build pass.

---

## Phụ thuộc

- **EZWAY company info** (cho Sender hardcode): env vars `COMPANY_NAME`, `COMPANY_ADDRESS_*`, `COMPANY_PHONE`, `COMPANY_CONTACT_NAME`. Đã đề cập trong customs plan (giờ rút gọn).
- **Country ISO list**: dùng package `i18n-iso-countries` hoặc seed `countries.json` (10kb) — ~5 phút setup.
- **Clipboard API**: native browser, không cần lib.
- **Tracking module Phase 2** (auto-poll Kango API): plan riêng đã có; Phase A này chỉ cần admin paste tay.

---

## Câu hỏi mở

1. **Backfill old orders**: backfill `carrierForwardedAt` cho old DELIVERED/CLOSED → mass update. OK?
2. **Khách hàng cũ vs Recipient cũ**: Customer hiện có địa chỉ VN (sender). Có cần migrate 1 phần thành Recipient cho B2C? → KHÔNG, vì Customer = sender, Recipient = consignee abroad. Khác nhau hoàn toàn.
3. **Carrier list cố định hay dynamic**: tạo bảng `Carrier` master data (KANGO, KSN, GO, ...) hay cứ enum/string đơn giản? → Phase A dùng string + dropdown từ env list. Phase B nếu cần phân quyền + analytics theo carrier mới làm Carrier table.
4. **Currency**: USD vs VND? Form Kango dùng USD cho invoice value. EZWAY hiện đếm tiền VND. Có cần exchange rate field? → Phase A: invoice items nhập USD (cho Kango), Order pricing vẫn VND. Sau này có thể thêm `exchangeRateVndPerUsd` snapshot.
