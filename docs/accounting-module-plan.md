# Kế hoạch: Module Sổ thu chi + Kế toán nội bộ + Payroll

> Brainstorm chốt 2026-05-24 — ước tính ~2-3 tuần code chia 4 phase.
> Áp dụng cho: Công ty TNHH MTV Thương mại & DV EZWAY (MST 0319557564), 4 NS, doanh
> thu hướng tới >1 tỷ/năm, chế độ kế toán theo **TT 133/2016/TT-BTC** (SMB).

## Quyết định kiến trúc (đã chốt)

| Câu hỏi | Đáp |
|---|---|
| Hướng đi | **Hybrid** — app làm cashbook + P&L + chứng từ + export Excel. Thuê kế toán dịch vụ ~1.5tr/tháng lập + nộp tờ khai qua eTax. |
| App có thay thế MISA không? | **KHÔNG**. App là tool hỗ trợ. Kế toán dịch vụ làm tờ khai chính thức (TCT yêu cầu chữ ký số token CA). |
| Sổ kế toán đúng VAS? | **Không**. App chỉ giữ "sổ chi tiết" + "sổ quỹ" — kế toán sẽ chuyển sang sổ cái khi nộp BCTC. |
| HĐĐT cho khách | Defer Phase D — chọn nhà cung cấp sau (xem so sánh dưới). |
| Payroll | **Có** — full bảng lương + BHXH/BHYT/BHTN + TNCN lũy tiến (Phase C). |
| Multi-currency | KHÔNG. Chỉ VND. |
| Bút toán kép | KHÔNG. Chỉ single-entry (mỗi giao dịch 1 dòng có from/to account). |

---

## Cảnh báo pháp lý (đã hiểu, vẫn đi tiếp)

1. **App không thay thế nghĩa vụ pháp lý**: kế toán dịch vụ ký BCTC + nộp tờ khai trên eTax với chữ ký số doanh nghiệp.
2. **HĐĐT phải dùng nhà cung cấp được TCT cấp phép** — không tự build (cần 6-12 tháng certify).
3. **Cứ 12 tháng** rà soát: luật thuế đổi, mức giảm trừ TNCN đổi, mức lương tối thiểu đổi → cập nhật app.
4. **Lưu trữ chứng từ**: hoá đơn đầu vào phải lưu **10 năm** (Luật Kế toán 2015). App lưu link/ảnh → đủ.

---

## So sánh nhà cung cấp HĐĐT (cho Phase D — quyết định sau)

| Nhà cung cấp | Phí gói nhỏ | Phù hợp |
|---|---|---|
| **VNPT Invoice** | ~154k khởi điểm | Phổ thông, hỗ trợ TCT tốt |
| **Viettel S-Invoice** | ~143k/300 HĐ, HSM chuẩn Tier 3 | Bảo mật cao |
| **Misa MeInvoice** | Cao hơn | Tích hợp tốt nếu sau này mua MISA AMIS |
| **EasyInvoice** | Rẻ nhất, UI dễ | 250k+ DN dùng, SMB favorite |

Khuyến nghị: **EasyInvoice** hoặc **VNPT Invoice** — phí thấp, API REST đơn giản, tích hợp dễ ở Phase D.

---

# Schema chung

## Bảng `CashAccount` (quỹ — tiền mặt / ngân hàng)
```prisma
model CashAccount {
  id        String          @id @default(cuid())
  code      String          @unique     // "CASH", "MB-9999", ...
  name      String                       // "Tiền mặt két", "MB Bank doanh nghiệp"
  type      CashAccountType              // CASH | BANK
  bankCode  String?                       // VietQR bank code (MB, BIDV, ...)
  accountNumber String?                   // STK ngân hàng
  isActive  Boolean         @default(true)
  openingBalanceVnd Int     @default(0)   // số dư đầu kỳ khi setup
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
  deletedAt DateTime?

  outflows  LedgerEntry[]   @relation("FromAccount")
  inflows   LedgerEntry[]   @relation("ToAccount")

  @@map("cash_accounts")
}

enum CashAccountType { CASH BANK }
```

## Bảng `LedgerCategory` (phân loại thu/chi theo TT 133)
```prisma
model LedgerCategory {
  id          String              @id @default(cuid())
  code        String              @unique  // "511", "642-7", "334" (mã TK kế toán)
  name        String                       // "Doanh thu bán hàng và CCDV"
  type        LedgerCategoryType            // INCOME | EXPENSE | TRANSFER_INTERNAL
  group       String                        // "Chi phí quản lý", "Doanh thu", "Chi phí bán hàng"
  vatDeductible Boolean           @default(false)  // chi phí có VAT khấu trừ không
  isActive    Boolean             @default(true)
  description String?

  entries     LedgerEntry[]

  @@map("ledger_categories")
}

enum LedgerCategoryType { INCOME EXPENSE TRANSFER_INTERNAL }
```

**Seed mặc định** (TT 133, gọn cho SMB):
- INCOME: 511 Doanh thu BH&CCDV / 515 Doanh thu HĐ tài chính / 711 Thu nhập khác
- EXPENSE — Giá vốn: 632 Giá vốn hàng bán
- EXPENSE — CP bán hàng: 6421 Lương, 6422 Marketing, 6423 Hoa hồng, 6428 Khác
- EXPENSE — CP quản lý: 6421qa Lương quản lý, 6422qa Thuê văn phòng, 6423qa Điện nước, 6424qa VPP, 6425qa Khấu hao, 6427qa Phí ngân hàng, 6428qa Khác
- EXPENSE — CP tài chính: 635 Lãi vay
- EXPENSE — Khác: 811 Chi phí khác
- TRANSFER_INTERNAL: chuyển quỹ nội bộ (cash ↔ bank)

## Bảng `LedgerEntry` (sổ chứng từ chính)
```prisma
model LedgerEntry {
  id          String              @id @default(cuid())
  code        String              @unique  // "PT-2605-0001" / "PC-2605-0001"
  type        LedgerCategoryType            // mirror category type
  occurredAt  DateTime                      // ngày phát sinh (= ngày trên hoá đơn)
  amountVnd   Int                            // số tiền (chưa VAT nếu có VAT)
  vatRate     Int?                           // 0, 5, 8, 10 (%)
  vatAmountVnd Int?                          // tiền VAT
  totalVnd    Int                            // amountVnd + vatAmountVnd

  categoryId  String
  category    LedgerCategory   @relation(fields: [categoryId], references: [id])

  // From/To: tuỳ type
  // INCOME: chỉ toAccount (tiền vào)
  // EXPENSE: chỉ fromAccount (tiền ra)
  // TRANSFER_INTERNAL: cả 2
  fromAccountId String?
  fromAccount   CashAccount?     @relation("FromAccount", fields: [fromAccountId], references: [id])
  toAccountId   String?
  toAccount     CashAccount?     @relation("ToAccount", fields: [toAccountId], references: [id])

  // Đối tác (NCC/khách hàng) — optional
  counterpartyName     String?
  counterpartyTaxCode  String?
  invoiceNumber        String?     // số HĐ đầu vào
  invoiceDate          DateTime?
  description          String?
  receiptUrls          String[]    // link ảnh/PDF chứng từ (S3 / public folder)

  // Liên kết hệ thống (tránh nhập trùng)
  linkedPaymentId       String?  @unique
  linkedPayment         Payment? @relation(fields: [linkedPaymentId], references: [id], onDelete: SetNull)
  linkedOrderId         String?
  linkedOrder           Order?   @relation(fields: [linkedOrderId], references: [id], onDelete: SetNull)
  linkedPayrollLineId   String?  @unique
  linkedPayrollLine     PayrollLine? @relation(fields: [linkedPayrollLineId], references: [id], onDelete: SetNull)

  createdById String
  createdBy   User      @relation("LedgerCreatedBy", fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@index([occurredAt])
  @@index([categoryId, occurredAt])
  @@map("ledger_entries")
}
```

**Quan trọng**: `LedgerEntry` là **truth source**. Payment/Order/OrderExtraCost/PayrollLine vẫn tồn tại cho vận hành, nhưng khi cần báo cáo tài chính → chỉ đọc `LedgerEntry`. Một số entry **auto-generate** từ Payment/PayrollLine (link 1-1 qua `linkedPayment` / `linkedPayrollLine`), số khác **nhập tay** (lương cho freelancer, thuê nhà, điện nước, etc.).

---

# Phase A — Cashbook + Sổ chứng từ (~1 tuần)

## Mục tiêu
- Quản lý các quỹ tiền (cash + bank).
- Nhập tay chứng từ thu/chi với upload ảnh hoá đơn.
- Auto-sync Payment (đã có Phase 1) thành LedgerEntry INCOME 511.
- Dashboard P&L tháng/quý đơn giản.

## Code

### Schema + migrations
- `cash_accounts`, `ledger_categories`, `ledger_entries`, enum `CashAccountType`, `LedgerCategoryType`.
- Seed 15-20 LedgerCategory theo TT 133.
- Seed 2 CashAccount mặc định: "Tiền mặt" + "Ngân hàng chính".

### Routes
- `/admin/accounting` — landing: KPI tháng (Doanh thu thật, Chi phí, Lợi nhuận, Số dư quỹ).
- `/admin/accounting/entries` — list tất cả LedgerEntry, filter theo type/category/khoảng ngày/quỹ. Có nút "Nhập chứng từ thu" + "Nhập chứng từ chi".
- `/admin/accounting/entries/new?type=EXPENSE` + `/admin/accounting/entries/[id]` + `/edit`.
- `/admin/accounting/accounts` — CRUD CashAccount (ADMIN).
- `/admin/accounting/categories` — CRUD LedgerCategory (ADMIN).

### Auto-sync hooks
Sau khi tạo/sửa/xoá Payment (Phase 1 + Phase 2 Sepay sau này):
```ts
// Trong syncOrderPaymentTotals hoặc hook riêng:
// Nếu Payment chưa có LedgerEntry → tạo INCOME 511 link tới Payment
// Nếu Payment.amount đổi → update LedgerEntry tương ứng
// Nếu Payment xoá → soft-delete LedgerEntry (giữ audit)
```

Tương tự cho:
- `OrderExtraCost` → EXPENSE phân loại theo `OrderExtraCost.categorySnapshot`
- `StockMovement type=OUT` (xuất kho vật tư cho đơn) → EXPENSE 632 Giá vốn
- `StartupExpense` (đã có) → EXPENSE 642 hoặc 811

### File upload chứng từ
- Phase A đơn giản: dùng folder local `public/uploads/receipts/` + filename random. Lưu URL relative trong `receiptUrls`.
- Future: thay S3/Cloudflare R2 nếu hosting cho phép (Phase D hosting + backup).

### P&L view
```
Doanh thu (511 + 515 + 711)         X
- Giá vốn (632)                     X
= Lãi gộp                           X
- CP bán hàng (642x)                X
- CP quản lý (642yqa)               X
- CP tài chính (635)                X
+ Thu nhập khác (711)               X
= Lợi nhuận trước thuế              X
```
- Filter: tháng/quý/năm/khoảng tuỳ chọn.
- 2 view: **Cơ sở dồn tích** (từ Order.totalFeeVnd CLOSED+DELIVERED) vs **Cơ sở tiền** (từ Payment thực thu). Mặc định: tiền (cash basis cho cashbook).

---

# Phase B — Export báo cáo + Bảng kê HĐ (~3-4 ngày)

## Mục tiêu
Kế toán dịch vụ nhận file Excel của tao → copy paste vào MISA của họ → lập tờ khai.

## Reports

### 1. Sổ quỹ tiền mặt (S07-DNN)
- Mẫu TT 133: Ngày | Số CT | Diễn giải | Tài khoản đối ứng | Thu | Chi | Tồn cuối.
- Generate từ LedgerEntry where fromAccount/toAccount = CashAccount (CASH type), sắp xếp theo ngày.
- Export XLSX.

### 2. Sổ tiền gửi ngân hàng (S08-DNN)
- Tương tự, lọc theo CashAccount BANK type.

### 3. Bảng kê hoá đơn đầu vào (đính kèm tờ khai 01/GTGT)
- LedgerEntry EXPENSE có `invoiceNumber` + `counterpartyTaxCode` + `vatAmountVnd > 0`.
- Cột: STT | Ngày HĐ | Số HĐ | Tên NCC | MST | Mặt hàng | Tiền chưa VAT | Thuế suất | Thuế GTGT.

### 4. Bảng kê hoá đơn đầu ra (đính kèm tờ khai 01/GTGT)
- Từ Order CLOSED/DELIVERED (HĐĐT sau khi có Phase D — Phase B chưa có HĐĐT thì tạm chỉ là "danh sách đơn xuất").
- Cột: STT | Ngày | Số HĐ | Tên KH | MST | Hàng hoá/DV | Doanh thu | Thuế suất | VAT.

### 5. Báo cáo P&L tháng (mẫu B02-DNN — gọn)
- Doanh thu, Giá vốn, Lãi gộp, CP bán hàng, CP quản lý, CP tài chính, Thu nhập khác, **Lợi nhuận trước thuế**, **Tạm tính TNDN 20%**.
- Export XLSX hoặc PDF.

### 6. Sổ chi tiết tài khoản
- Filter theo LedgerCategory → list mọi entry của category đó kèm running balance.

### Cách triển khai export
- Dùng `exceljs` (mature, lightweight). Tự design XLSX với header + data row + tổng cuối.
- API route `/api/accounting/export/<reportType>?from=...&to=...` → trả file XLSX.
- Permission: ADMIN.

---

# Phase C — Payroll (~1 tuần)

## Mục tiêu
Quản lý 4 nhân sự + giám đốc: lương cố định, BHXH/BHYT/BHTN/KPCĐ, TNCN lũy tiến từng phần, netSalary cuối tháng. Auto-generate LedgerEntry chi lương (642x).

## Schema

```prisma
model PayrollProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Hợp đồng
  startDate       DateTime
  endDate         DateTime?
  contractType    String?  // "Vô thời hạn", "Xác định thời hạn 12 tháng", ...
  jobTitle        String?  // chức danh (lưu ngoài EmployeeProfile để track lịch sử lương)

  // Lương
  baseSalaryVnd        Int    // lương cơ bản (ghi trong HĐLĐ)
  bhxhSalaryVnd        Int    // lương đóng BHXH (thường = baseSalary nhưng có thể khác)
  allowanceTaxableVnd  Int    @default(0)  // phụ cấp tính thuế
  allowanceNonTaxableVnd Int  @default(0)  // phụ cấp không tính thuế (ăn ca <730k, công tác phí, etc.)

  // TNCN
  taxCode         String?  // MST cá nhân
  dependentCount  Int      @default(0)  // số người phụ thuộc (giảm trừ 4.4tr/người)

  // BHXH
  socialInsuranceCode String?  // mã sổ BHXH

  // Active
  isActive        Boolean  @default(true)

  payrollLines    PayrollLine[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("payroll_profiles")
}

model PayrollRun {
  id          String   @id @default(cuid())
  code        String   @unique           // "PR-2026-05"
  periodMonth Int                          // 1-12
  periodYear  Int
  status      PayrollRunStatus  @default(DRAFT)
  notes       String?

  lines       PayrollLine[]

  createdById String
  createdBy   User     @relation("PayrollRunCreatedBy", fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  finalizedAt DateTime?
  paidAt      DateTime?

  @@unique([periodYear, periodMonth])
  @@map("payroll_runs")
}

enum PayrollRunStatus { DRAFT FINAL PAID }

model PayrollLine {
  id             String        @id @default(cuid())
  runId          String
  run            PayrollRun    @relation(fields: [runId], references: [id], onDelete: Cascade)
  profileId      String
  profile        PayrollProfile @relation(fields: [profileId], references: [id], onDelete: Restrict)

  // Snapshot (immutable sau khi FINAL)
  baseSalarySnapshotVnd     Int
  bhxhSalarySnapshotVnd     Int
  allowanceTaxableVnd       Int
  allowanceNonTaxableVnd    Int
  dependentCount            Int

  // Tính toán
  grossSalaryVnd            Int     // baseSalary + allowanceTaxable + allowanceNonTaxable
  bhxhEmployeeVnd           Int     // 8% × bhxhSalary
  bhytEmployeeVnd           Int     // 1.5% × bhxhSalary
  bhtnEmployeeVnd           Int     // 1% × bhxhSalary
  totalInsuranceEmployeeVnd Int     // tổng 10.5% NLĐ

  bhxhEmployerVnd           Int     // 17.5% × bhxhSalary (gồm hưu trí 14% + ốm đau 3% + TNLĐ 0.5%)
  bhytEmployerVnd           Int     // 3% × bhxhSalary
  bhtnEmployerVnd           Int     // 1% × bhxhSalary
  totalInsuranceEmployerVnd Int     // 21.5% DN gánh

  taxableIncomeVnd          Int     // grossSalary - bhxh NLĐ - allowanceNonTaxable - 11tr - 4.4tr × dependentCount
  pitVnd                    Int     // TNCN tính lũy tiến từng phần

  netSalaryVnd              Int     // grossSalary - bhxh NLĐ - pit

  ledgerEntryIds            String[] // các LedgerEntry auto-gen (chi lương, BHXH, TNCN)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([runId, profileId])
  @@map("payroll_lines")
}
```

## Công thức (theo luật VN 2026)

### Tỷ lệ BHXH (đã verify 2026)
| Loại | NLĐ % | DN % | Tổng |
|---|---|---|---|
| Hưu trí | 8% | 14% | 22% |
| Ốm đau - thai sản | 0% | 3% | 3% |
| TNLĐ - BNN | 0% | 0.5% | 0.5% |
| BHYT | 1.5% | 3% | 4.5% |
| BHTN | 1% | 1% | 2% |
| **Tổng** | **10.5%** | **21.5%** | **32%** |

Trần đóng BHXH: 20 lần lương cơ sở. Trần BHTN: 20 lần lương tối thiểu vùng.

### TNCN lũy tiến từng phần (NQ 954/2020/UBTVQH14)
Giảm trừ:
- Bản thân: **11,000,000 đ/tháng**
- Mỗi người phụ thuộc: **4,400,000 đ/tháng**

Bậc thuế:
| Bậc | TNCN tính thuế/tháng | Thuế suất |
|---|---|---|
| 1 | ≤ 5tr | 5% |
| 2 | 5tr — 10tr | 10% |
| 3 | 10tr — 18tr | 15% |
| 4 | 18tr — 32tr | 20% |
| 5 | 32tr — 52tr | 25% |
| 6 | 52tr — 80tr | 30% |
| 7 | > 80tr | 35% |

```ts
function calculatePIT(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  const brackets = [
    [5_000_000, 0.05],
    [10_000_000, 0.10],
    [18_000_000, 0.15],
    [32_000_000, 0.20],
    [52_000_000, 0.25],
    [80_000_000, 0.30],
    [Infinity, 0.35],
  ];
  let remaining = taxableIncome, prev = 0, tax = 0;
  for (const [cap, rate] of brackets) {
    const slice = Math.min(remaining, cap - prev);
    if (slice <= 0) break;
    tax += slice * rate;
    remaining -= slice;
    prev = cap;
  }
  return Math.round(tax);
}
```

## Routes
- `/admin/accounting/payroll-profiles` — list + CRUD hồ sơ lương (ADMIN; lưu ý SALARY là dữ liệu nhạy cảm → ADMIN only).
- `/admin/accounting/payroll-runs` — list runs, mỗi run = 1 tháng.
- `/admin/accounting/payroll-runs/new` — tạo run cho tháng X → auto-generate dòng cho từng employee active.
- `/admin/accounting/payroll-runs/[id]` — detail: bảng lương, có nút "Finalize" + "Mark paid" + "Export bảng lương XLSX".
- Finalize: snapshot tất cả PayrollProfile fields vào PayrollLine + auto-gen LedgerEntry EXPENSE 6421 (lương) + 3383 (BHXH phải nộp).
- Mark paid: link LedgerEntry với CashAccount thực chi.

## Reports payroll
- **Bảng lương tháng** (mẫu công ty, XLSX): mã NV, họ tên, lương cơ bản, phụ cấp, gross, BHXH NLĐ, TNCN, net, ký nhận.
- **Báo cáo tổng hợp BHXH tháng** (D02-TS): tổng tiền BHXH DN phải nộp.
- **Tờ khai TNCN tháng/quý 05/KK-TNCN** (XLSX) — kế toán sẽ paste vào tờ khai chính thức.

---

# Phase D — Tích hợp HĐĐT (defer, ước ~1 tuần)

## Mục tiêu
Khi Order chốt (status = DELIVERED hoặc CLOSED), tự gọi API nhà cung cấp HĐĐT (đã chọn ở mục so sánh) để xuất HĐĐT cho khách.

## Decisions cần chốt trước Phase D
1. Chọn nhà cung cấp HĐĐT (VNPT / Viettel / Misa / EasyInvoice).
2. Mua gói + đăng ký với TCT (3-7 ngày làm việc).
3. Lấy API endpoint + credentials.

## Phase D scope (high-level)
- Bảng `EInvoice`: link Order ↔ HĐĐT (số HĐ, mẫu số, ký hiệu, ngày phát hành, link PDF, status).
- Action `issueEInvoice(orderId)` — gọi API NCC, lưu kết quả.
- Auto-issue khi Order CLOSED (cron) hoặc nút manual.
- UI Order detail: hiển thị HĐĐT đã xuất + nút "Tải PDF" + nút "Huỷ hoá đơn" (gọi API NCC).

→ Tao tách riêng plan `docs/einvoice-integration-plan.md` khi đến lúc.

---

# Phân quyền (rất quan trọng — lương là dữ liệu nhạy cảm)

| Module | ADMIN | STAFF | SALE | DRIVER |
|---|---|---|---|---|
| CashAccount CRUD | ✅ | ❌ | ❌ | ❌ |
| LedgerCategory CRUD | ✅ | ❌ | ❌ | ❌ |
| LedgerEntry CRUD (income/expense) | ✅ | ✅ | ❌ | ❌ |
| LedgerEntry view | ✅ | ✅ | ❌ | ❌ |
| P&L view | ✅ | ❌ | ❌ | ❌ |
| PayrollProfile CRUD | ✅ | ❌ | ❌ | ❌ |
| PayrollRun CRUD | ✅ | ❌ | ❌ | ❌ |
| PayrollRun view (self only) | ✅ | self | self | self |
| Export reports | ✅ | ❌ | ❌ | ❌ |

→ Mọi user xem được **payslip của chính mình** (phái sinh từ PayrollLine), nhưng KHÔNG thấy của người khác.

---

# Out of scope (đẩy về sau hoặc KHÔNG làm)

- ❌ Bút toán kép sổ cái VAS đầy đủ.
- ❌ Bảng cân đối kế toán + báo cáo lưu chuyển tiền tệ tự sinh — kế toán dịch vụ làm trên MISA.
- ❌ Tự nộp tờ khai lên eTax — cần chữ ký số CA + T-VAN.
- ❌ Tự build HĐĐT (Phase D dùng API NCC).
- ❌ Khấu hao TSCĐ tự động — nhập tay LedgerEntry hàng tháng nếu cần.
- ❌ Quyết toán năm TNCN cho NLĐ tự sinh — kế toán làm.
- ❌ Multi-currency.
- ❌ Hoa hồng SALE tự tính + auto-payroll.

---

# Tích hợp với hệ thống hiện có

| Bảng hiện tại | Vai trò trong module mới |
|---|---|
| `Payment` (Phase 1+2) | Auto-tạo LedgerEntry INCOME khi tạo Payment → 1-1 link `LedgerEntry.linkedPayment` |
| `OrderExtraCost` | Auto-tạo LedgerEntry EXPENSE khi appliedAt thực tế chi |
| `StockMovement (OUT)` | Auto-tạo LedgerEntry EXPENSE 632 Giá vốn cho mỗi xuất kho |
| `StartupExpense` | Migrate vào `LedgerEntry` EXPENSE 642 với category đặc biệt; bảng cũ vẫn giữ cho UI khởi nghiệp |
| `CostItem` (master data) | KHÔNG đụng — vẫn dùng cho catalog phụ phí trên đơn |
| `Order` (CLOSED+DELIVERED) | Source cho Bảng kê HĐ đầu ra. Phase D mới gắn HĐĐT |

---

# Rủi ro / lưu ý

1. **Soft-delete vs hard-delete**: LedgerEntry cần `deletedAt` (soft) để audit. Không cho xoá khi đã trong tháng đã FINAL payroll hoặc đã export báo cáo.
2. **Snapshot vs live**: PayrollLine snapshot baseSalary/dependents tại thời điểm FINAL. Sau khi FINAL không sửa được — phải tạo run mới (điều chỉnh).
3. **Lương quá khứ**: nếu user lùi ngày đổi salary → không revert PayrollRun đã FINAL. Phải tạo "PayrollAdjustment" tay (defer Phase C-2).
4. **Tỷ lệ BHXH có thể đổi**: viết thành constants file (`lib/payroll/constants.ts`) + tài liệu hoá nguồn (link luatvietnam.vn) để update nhanh.
5. **TNCN giảm trừ có thể đổi**: Quốc hội từng nâng từ 9tr lên 11tr năm 2020. Viết hard-coded constant + version comment.
6. **Race ledger entry vs payment**: tạo Payment + tạo LedgerEntry phải nằm trong cùng `prisma.$transaction` để tránh inconsistency.
7. **Backfill existing data**: khi deploy Phase A, viết script `prisma/scripts/backfill-ledger.ts` quét tất cả Payment hiện có + StartupExpense hiện có → tạo LedgerEntry tương ứng.
8. **Số dư đầu kỳ**: lúc onboard phải nhập opening balance cho mỗi CashAccount. Nếu nhập sai → toàn bộ runtime balance lệch. Cần UI rõ + có thể chỉnh sửa (ADMIN only, có audit log).
9. **File upload size**: hoá đơn ảnh có thể 1-5MB. Phase A simple: limit 5MB/file, 5 file/entry. Nếu hosting Vercel sẽ cần Blob storage (Vercel Blob hoặc R2).

---

# Thứ tự thực hiện chi tiết

## Phase A (~5-7 ngày code)
1. Schema + migration `add_accounting` (cash_accounts, ledger_categories, ledger_entries).
2. Seed default categories + 2 cash accounts.
3. `features/accounting/` — schemas, queries, actions.
4. UI: list/CRUD entries, accounts, categories.
5. Auto-sync hook: Payment create → LedgerEntry create (trong transaction syncOrderPaymentTotals).
6. Backfill script: existing Payment + StartupExpense → LedgerEntry.
7. P&L view (tháng/quý/năm, cash basis + accrual toggle).
8. File upload chứng từ (local folder).
9. Update roadmap + lint + build.

## Phase B (~3-4 ngày)
1. Lib `exceljs` install + helper `lib/excel.ts`.
2. Export route `/api/accounting/export/<reportType>?from=&to=` (ADMIN only).
3. 6 mẫu báo cáo (sổ quỹ TM, sổ NH, bảng kê HĐ vào/ra, P&L, sổ chi tiết).
4. UI: trang `/admin/accounting/reports` → chọn mẫu + khoảng → tải XLSX.
5. Smoke test với data mẫu.

## Phase C (~5-7 ngày)
1. Schema + migration `add_payroll`.
2. `features/payroll/` — schemas, queries, actions, calc lib (BHXH + TNCN).
3. Constants file `lib/payroll/rates.ts` với version comment.
4. UI: list/CRUD PayrollProfile (ADMIN), PayrollRun list/detail.
5. Logic finalize → snapshot + auto-gen LedgerEntry.
6. UI payslip cá nhân ở `/admin/profile` (read-only).
7. Export bảng lương XLSX.
8. Update roadmap + lint + build.

## Phase D (defer ~1 tuần — sau khi chọn HĐĐT)
1. Plan riêng `docs/einvoice-integration-plan.md`.

---

# Success metrics tổng

- [ ] ADMIN nhập 1 chứng từ chi (mua xăng 500k VAT 10%) + upload ảnh hoá đơn → entry hiển thị + đếm vào P&L.
- [ ] Payment Phase 1 tự tạo LedgerEntry INCOME, P&L cập nhật.
- [ ] Backfill script chạy không lỗi, P&L tháng trước khớp với realtime.
- [ ] Export Sổ quỹ tiền mặt + Bảng kê HĐ đầu vào XLSX, kế toán dịch vụ xác nhận đúng mẫu TT 133/TT 80.
- [ ] Tạo PayrollRun tháng → đủ 5 dòng nhân sự, TNCN + BHXH tính đúng (manually verify với 1 case mẫu trên https://tncnonline.com.vn).
- [ ] SALE/STAFF không thấy được bảng lương của người khác, chỉ thấy của mình.
- [ ] Finalize PayrollRun → LedgerEntry chi lương + chi BHXH tự sinh + P&L tháng cập nhật.

---

# Khi nào tiếp tục

- Chốt scope Phase A vs A+B vs A+B+C lúc bắt đầu code.
- Khuyến nghị: code Phase A trước (~1 tuần) → dùng 1-2 tuần thực tế → feedback → mới code Phase B + C.
- KHÔNG nên code 3 phase liền — sẽ phát hiện sai sót schema sau khi dùng thật.
- Phase D đợi đến khi:
  - Chốt nhà cung cấp HĐĐT.
  - Đã đăng ký + có credentials API.
  - Kế toán dịch vụ confirm flow xuất HĐĐT phù hợp.
