# Kế hoạch: Customs Docs Collection cho International Shipments

> ⚠️ **ARCHIVED 2026-05-26** — Plan này OVER-ENGINEERED cho mô hình hiện tại của
> EZWAY (forwarder layer giữa SALE và chuyên tuyến Kango/KSN/Go). Customs/HS code/
> restricted items do **upstream carrier lo**, EZWAY chỉ cần thu data cơ bản
> giống form chuyên tuyến. Xem `forwarder-processing-plan.md` thay thế.
>
> Reopen plan này khi EZWAY chuyển sang **làm việc trực tiếp với hãng bay**
> (cần tự khai báo customs với cơ quan hải quan các nước, không qua carrier
> intermediary). Estimate ~1-3 năm sau.

---

## (Nội dung gốc bên dưới chỉ giữ làm tham khảo)

> Brainstorm chốt 2026-05-26 — code sau khi xong tracking module + Sepay Phase 2.
> Ước tính ~5-7 ngày code chia 3 phase.
> Bắt buộc trước **1/7/2026** (EU áp €3 customs duty per item type cho parcel ≤€150).

## Bối cảnh pháp lý 2026

| Thị trường | Ngưỡng & yêu cầu | Hệ quả với EZWAY |
|---|---|---|
| **EU** | Từ 1/7/2026: €3 customs duty / item type cho parcel ≤€150 + VAT vẫn qua IOSS. Mỗi item type (HS code khác nhau) trong 1 kiện = €3 riêng. | **PHẢI** có HS code + declared value PER ITEM. |
| **US** | Section 321 de minimis $800 (cá nhân/ngày). Trên $800 cần commercial invoice + HTS code. | Commercial invoice + HTS bắt buộc khi >$800. |
| **UK** | ≤£135: VAT thu tại điểm bán (point of sale). >£135: VAT + duty tại biên giới. | Cần value + content declaration. |
| **Canada** | De minimis CAD $20 cực thấp → gần như mọi parcel đều cần customs. CUSMA tariff áp dụng. | Bắt buộc HS code + value. |
| **Australia** | De minimis AUD $1000. GST registration nếu sales >$75k/năm. | Value declaration; >$1000 cần customs entry. |

**Kết luận**: với forwarder VN bán cho khách VN gửi cá nhân đi 5 thị trường này, **HS code + declared value + content description là bắt buộc cho TẤT CẢ đơn**. Không phải optional nữa.

## Quyết định kiến trúc đã chốt

| Câu hỏi | Đáp |
|---|---|
| EZWAY có register IOSS / EORI / GST tự mình không? | **KHÔNG**. Forwarder 4 người không nên. Dùng carrier DDP service (DHL/FedEx/UPS thu VAT+duty hộ tại biên giới, charge back EZWAY). KISS. |
| Customs filing trực tiếp? | **KHÔNG**. Carrier lo. EZWAY chỉ cung cấp data → carrier API forward khi tích hợp Phase D Tracking. |
| HS code data: tự seed hay API lookup? | **Hybrid**: seed ~200 mã phổ biến (quần áo, đồ điện tử, mỹ phẩm, đồ ăn khô, sách...) + cho khách gõ tự do nếu không có. |
| Restricted items check? | **Có**. Danh sách theo destination, hiển thị checkbox xác nhận trước submit đơn. |
| Granularity declared value? | **Per item** trong 1 đơn (vì EU áp €3 per item type). Không gộp tổng. |
| Generate commercial invoice PDF? | **Có**. Khi đơn `CONFIRMED` → tự gen PDF tiếng Anh, đính kèm record + cho khách xem. |
| IOSS / DDP toggle? | **Cho phép cả 2 trong tương lai**. Phase A: chỉ DDP mode. Phase IOSS defer. |

## Schema thiết kế

### Bảng mới `OrderItem` (chi tiết hàng trong đơn, cho customs)
```prisma
model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)

  // Mô tả hàng (English cho customs)
  description String                       // "Cotton T-shirt women", "Phone case silicone"
  descriptionVi String?                    // optional Vietnamese cho admin
  hsCode      String                       // 6-10 digit, vd "6109.10.00"

  quantity    Int                          // số đơn vị
  unitValueUsd  Decimal @db.Decimal(10, 2) // giá đơn vị USD
  totalValueUsd Decimal @db.Decimal(10, 2) // = quantity × unitValueUsd

  weightKg    Decimal? @db.Decimal(8, 3)   // optional, ước tính per item
  originCountry String @default("VN")      // VN, CN, US (Made in)

  isHazardous Boolean @default(false)      // pin lithium, mỹ phẩm lỏng, etc.
  hazardType  String?                      // "LITHIUM_BATTERY", "LIQUID_COSMETIC", ...

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([orderId])
  @@map("order_items")
}
```

### `Order` thêm fields
```prisma
model Order {
  // ... existing
  destinationCountry      String?   // "US", "DE", "GB", "CA", "AU"
  totalDeclaredValueUsd   Decimal?  @db.Decimal(12, 2)  // = sum OrderItem.totalValueUsd
  customsPurpose          CustomsPurpose @default(GIFT) // GIFT | MERCHANDISE | DOCUMENTS | SAMPLE
  incoterm                String?   // "DDP" mặc định; future: "DDU"
  insuranceCoverageUsd    Decimal?  @db.Decimal(12, 2)  // optional khai báo giá trị bảo hiểm

  // Acknowledge khách đã xác nhận không gửi restricted items
  restrictedItemsAcknowledged Boolean @default(false)

  // Commercial invoice
  commercialInvoiceUrl    String?   // PDF link sau khi gen
  commercialInvoiceGenAt  DateTime?

  items                   OrderItem[]
}

enum CustomsPurpose {
  GIFT             // quà cá nhân (US <$100 thường miễn)
  MERCHANDISE      // hàng thương mại
  DOCUMENTS        // tài liệu
  SAMPLE           // hàng mẫu
  RETURN           // hàng trả về
}
```

### Bảng mới `HsCode` (seed catalog)
```prisma
model HsCode {
  code          String  @id           // "6109.10.00"
  description   String                 // "T-shirts, knitted, cotton"
  descriptionVi String                 // "Áo thun cotton"
  category      String                 // "APPAREL", "ELECTRONICS", "COSMETICS", ...
  /// Restricted countries (CSV) — vd nếu code này bị US ban thì list "US"
  restrictedIn  String?
  notes         String?
  isActive      Boolean @default(true)

  @@index([category])
  @@map("hs_codes")
}
```

### Bảng mới `RestrictedItem` (catalog hàng cấm/hạn chế per destination)
```prisma
model RestrictedItem {
  id           String  @id @default(cuid())
  destinationCountry String           // "US", "EU", "GB", "*" (all)
  category     String                  // "LITHIUM_BATTERY", "LIQUID", "FOOD_FRESH", ...
  label        String                  // tiếng Việt cho UI
  description  String                  // chi tiết
  severity     RestrictedSeverity       // PROHIBITED | RESTRICTED | NEEDS_DECLARATION
  guidance     String?                  // hướng dẫn thay thế

  @@index([destinationCountry])
  @@map("restricted_items")
}

enum RestrictedSeverity {
  PROHIBITED         // cấm hoàn toàn
  RESTRICTED         // cần giấy phép
  NEEDS_DECLARATION  // được phép nhưng phải khai báo đặc biệt
}
```

### Migration `add_customs_collection`
- Schema thêm: `order_items`, `hs_codes`, `restricted_items`, `Order.destinationCountry/...`, enums.
- Seed: ~200 HS codes phổ biến + ~30 restricted items.
- Backfill: order hiện có set `destinationCountry` từ `Service.destinationCode` nếu match.

---

## Phase A — Schema + seed data + form thu thập (~3 ngày)

### Tasks
1. Migration + Prisma generate.
2. Seed HS codes:
   - Lấy từ official EU CN code list / US HTS / WCO subset → top 200 dùng nhiều.
   - Đặt vào `prisma/seeds/hs-codes.json` (build-once script `prisma/seed-customs.ts`).
3. Seed restricted items: ~30 mục phổ biến (pin lithium, mỹ phẩm lỏng, đồ ăn tươi, thực phẩm chức năng, vũ khí, thuốc, vàng/bạc, ...).
4. UI Order Form:
   - Section "Thông tin hải quan" expand sau khi chọn Service quốc tế.
   - Field `destinationCountry` auto-fill từ `Service.destinationName` (verify).
   - `customsPurpose` dropdown.
   - Repeater "Mặt hàng" (OrderItem):
     - Description EN (placeholder gợi ý)
     - HS code autocomplete (tìm trong `HsCode` table by description/code)
     - Quantity, unit value USD
     - Origin country (default VN)
     - Toggle "Hàng nguy hiểm" + dropdown hazard type
   - Tổng `totalDeclaredValueUsd` tính tự động.
5. Restricted items section:
   - Theo `destinationCountry` → fetch `RestrictedItem` list.
   - Hiển thị 3 nhóm: PROHIBITED (đỏ), RESTRICTED (vàng), NEEDS_DECLARATION (xanh).
   - Checkbox cuối: "Tôi xác nhận đơn hàng KHÔNG chứa các mặt hàng PROHIBITED và đã khai báo đúng các mặt hàng RESTRICTED/NEEDS_DECLARATION." → set `restrictedItemsAcknowledged`.
   - Submit chặn nếu chưa check.

### Permission
- SALE/STAFF/ADMIN: tạo + sửa items khi đơn ở DRAFT/PENDING.
- Sau CONFIRMED: lock customs data (khoá form, chỉ ADMIN override).

---

## Phase B — Commercial invoice PDF generation (~1-2 ngày)

### Mục tiêu
Khi đơn `CONFIRMED`, tự gen PDF "Commercial Invoice" tiếng Anh đính kèm Order. Khách + admin download. Carrier dùng để khai báo.

### Tools
- `pdf-lib` (đã cân nhắc cho label printing — combo).
- Template A4 tiếng Anh, lưu PDF vào `public/uploads/commercial-invoices/<order-id>.pdf` (hoặc Vercel Blob khi deploy).

### Nội dung PDF
- Header: "EZWAY EXPRESS — COMMERCIAL INVOICE", logo, invoice #, date.
- Shipper: name, address, phone (từ EZWAY company config).
- Consignee: name, address, phone, email (từ Order/Customer).
- Service: name + tier.
- Table items: SKU | Description | HS code | Origin | Qty | Unit value | Total value.
- Total declared value.
- Purpose of shipment (GIFT/MERCHANDISE/...).
- Incoterm: DDP.
- Acknowledgment: "I certify that the information herein is true and complete and that the contents are as stated."
- Signature placeholder.

### Logic
- Khi `Order.status` chuyển từ DRAFT/PENDING → CONFIRMED (qua updateOrder action), gen PDF + lưu URL.
- Re-gen khi: đổi items / customer / destination → invalidate old PDF.
- Khách thấy nút "Tải Commercial Invoice" trên Order detail (nếu là khách EZWAY's customer portal — defer).

---

## Phase C — Validation engine + UX polish (~1-2 ngày)

### Validation rules per destination
- **US** (`destinationCountry = "US"`):
  - Nếu `totalDeclaredValueUsd > 800` → warning "Đơn này >$800, cần khai báo chi tiết HTS code".
  - Hazardous items: cảnh báo per type (pin lithium cần dán nhãn UN3481, ...).
- **EU** (DE/FR/NL/...):
  - Sau 1/7/2026: warning "Đơn này có X item type × €3 = €Y customs duty sẽ thu tại EU".
  - Nếu IOSS chưa setup → toast "EZWAY dùng DDP service — phí thuế thu tại điểm giao".
- **UK**: cảnh báo nếu >£135.
- **Canada**: cảnh báo "Mọi đơn CA đều phải khai customs ở $20 CAD".
- **AU**: cảnh báo >$1000 AUD.

### UI helpers
- HS code search box: live filter theo description/code.
- Common items dropdown shortcut: "Áo (thun, sơ mi)", "Phụ kiện điện thoại", "Mỹ phẩm khô", "Đồ chơi", "Sách" → tự fill HS code + desc EN.
- Tooltip giải thích "HS code là gì" + link guide.

### Server-side validation in `createOrder`/`updateOrder`
- Nếu `destinationCountry` ≠ VN → bắt buộc:
  - ≥1 OrderItem
  - Mỗi item có HS code không rỗng
  - `restrictedItemsAcknowledged = true`
  - `totalDeclaredValueUsd > 0`

---

## Phase D — Carrier API integration (defer, ~1 tuần)

> Đợi đến khi tích hợp tracking Phase 2 (KSN/Go/FedEx/DHL API).

- Khi tạo shipment qua carrier API, forward customs data:
  - Items array + HS codes + values
  - Commercial invoice PDF URL
  - Incoterm DDP
- Carrier response → save `externalTrackingNumber` + `carrierShipmentId` vào `OrderCarrierTracking` (Phase 2 tracking).
- Webhook update from carrier: customs cleared / held / rejected.

---

## Out of scope (defer)

- ❌ **IOSS registration EZWAY tự đăng ký** — phức tạp accounting + 1 EU country VAT representative. Defer đến khi >€10k/tháng EU sales.
- ❌ **EORI number management** — DHL/FedEx có sẵn, EZWAY ride along.
- ❌ **AU GST registration** — chỉ cần nếu >$75k AUD/năm.
- ❌ **HS code AI auto-detect từ ảnh/text** — overkill, dùng autocomplete dropdown.
- ❌ **Customs claims** — nếu hàng bị giữ lại, handle qua email với carrier.
- ❌ **Tariff calculator real-time** (tính duty trước cho khách) — phức tạp, mỗi nước khác. Hiển thị placeholder "Phí thuế collect tại điểm giao (DDP)".

---

## Rủi ro / lưu ý

1. **HS code sai → hàng bị giữ tại hải quan**. UI cần ép sale chọn HS code đúng. ADMIN có thể review trước CONFIRMED. Phase B-2 (defer): kế toán dịch vụ review nhanh đơn lớn.
2. **Khai sai giá trị (under-declare)**: gian lận thuế hải quan. EZWAY có terms of service "khách chịu trách nhiệm khai báo đúng" để chuyển rủi ro. Note trong UI.
3. **Restricted items list cập nhật**: luật mỗi nước đổi liên tục. Cần cron / manual update bảng `restricted_items` quý. Lưu nguồn (link luật) trong `notes`.
4. **PDF i18n**: invoice English đủ cho carrier. Nếu khách muốn xem song ngữ → defer.
5. **Backup PDF**: nếu lưu local folder → mất khi đổi server. Khi deploy production → bắt buộc S3/R2/Vercel Blob.
6. **GDPR (EU customers)**: nếu lưu address người nhận EU lâu hơn 6 năm cần data deletion policy. Defer khi có legal review.
7. **Backfill data cũ**: order hiện có không có OrderItem → khi chuyển sang CONFIRMED đột nhiên fail validation. Mitigation: chỉ áp validation cho order tạo sau ngày deploy + admin batch fill cho đơn cũ.

---

## Thứ tự thực hiện

1. Phase A — schema + seed + form (3 ngày)
2. Phase B — commercial invoice PDF (1-2 ngày)
3. Phase C — validation + UX polish (1-2 ngày)
4. Roadmap update + lint + build + smoke test
5. Phase D — chờ Phase 2 Tracking với carrier API thật

**Tổng**: ~5-7 ngày code → có thể chạy parallel với tracking module.

---

## Success metrics

- [ ] Tạo đơn đi US với 3 items, mỗi item HS code + value khác nhau → form chấp nhận, `totalDeclaredValueUsd` tính đúng.
- [ ] Đổi destination từ US → DE → form auto-load restricted items list cho EU (lithium battery alert).
- [ ] Submit đơn không có HS code → server reject.
- [ ] Submit đơn EU không check restricted items → server reject.
- [ ] CONFIRMED đơn → PDF commercial invoice gen tự động, download được, nội dung khớp items.
- [ ] HS code autocomplete: gõ "shirt" → hiển thị 6109.10.00 và 6109.90.00.
- [ ] Đơn US <$800 + GIFT purpose → warning "có thể miễn Section 321".
- [ ] SALE thấy section customs trong form, KHÔNG sửa được sau CONFIRMED.
- [ ] Lint + build pass.

---

## Phụ thuộc

- **File storage** (Vercel Blob / R2 / local) — quyết định khi go-live deploy.
- **HS code source data** — ai cung cấp 200 codes phổ biến? Tao có thể seed từ public EU CN/US HTS subset (tự research). Quanh ngày code: 4-6h cho seed file.
- **Restricted items list per country** — luật pháp, cần verify với kế toán dịch vụ hoặc luật sư logistics. Phase A seed danh sách generic, refine sau.
- **Company config**: cần `BANK_*` (đã có cho Sepay) + thêm `COMPANY_NAME, COMPANY_ADDRESS, COMPANY_PHONE, COMPANY_EMAIL, COMPANY_LOGO_URL` cho header invoice.
