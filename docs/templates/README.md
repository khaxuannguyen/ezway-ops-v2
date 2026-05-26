# Payroll Template 2026 — Hướng dẫn dùng

File: `payroll-template-2026.xlsx`

## Mục đích

Excel mẫu để tính lương 4-10 NS đầu tiên của EZWAY (2-3 tháng), KHÔNG cần code
Payroll module trong app. Khi có 2-3 tháng data thật + thuê kế toán dịch vụ, lúc
đó upgrade lên app (Payroll Phase C theo `docs/accounting-module-plan.md`).

## Cách dùng

1. Mở `payroll-template-2026.xlsx` trong Excel hoặc upload Google Sheets.
2. Tab **"Bảng lương"** — sheet làm việc chính. 4 dòng sample đã có sẵn.
3. **Sửa dòng cho 4 NS thật** của EZWAY: chỉ chỉnh các cột màu trắng (input):
   - **B** Họ tên
   - **C** MST cá nhân (sau khi NS có)
   - **D** Số người phụ thuộc
   - **E** Lương cơ bản (theo HĐLĐ)
   - **F** Lương đóng BHXH (thường = E; trần 46.8tr/tháng)
   - **G** Phụ cấp tính thuế (thưởng, lương 13...)
   - **H** Phụ cấp KHÔNG tính thuế (ăn ca ≤730k, công tác phí thực chi...)
4. Các cột I-U **tự động tính** — đừng đụng formula.
5. **Mỗi tháng**: chuột phải tab "Bảng lương" → "Move or Copy" → tick "Create a
   copy" → đặt tên "T05-2026", "T06-2026"...
6. Sửa tiêu đề tháng ở ô A1, cập nhật cột E-H nếu có biến động (NS mới, thưởng).
7. Tab **"Hướng dẫn"** giải thích chi tiết từng cột + công thức TT 111/2013 đầy đủ.

## Công thức áp dụng (2026)

| Phần | Công thức |
|---|---|
| BHXH NLĐ | 8% × Lương BHXH |
| BHYT NLĐ | 1.5% × Lương BHXH |
| BHTN NLĐ | 1% × Lương BHXH |
| **Tổng BH NLĐ** | **10.5%** (trừ vào lương) |
| BHXH DN | 17.5% (gồm hưu trí 14% + ốm đau 3% + TNLĐ 0.5%) |
| BHYT DN | 3% |
| BHTN DN | 1% |
| **Tổng BH DN gánh** | **21.5%** (chi phí thêm cho DN) |
| Giảm trừ bản thân | 11,000,000 đ/tháng |
| Giảm trừ phụ thuộc | 4,400,000 đ/người/tháng |
| TNCN | Lũy tiến từng phần (5/10/15/20/25/30/35%) theo TT 111/2013 |

## Workflow cuối tháng

1. Sau ngày 25 hàng tháng → chốt bảng lương tháng đó.
2. Cột Q (Net) = tiền chuyển khoản cho NS.
3. Cột T (Tổng BH DN) + cột M (Tổng BH NLĐ) gộp lại = tiền nộp BHXH cho cơ quan
   BHXH huyện/quận (hạn 30 hằng tháng).
4. Cột O (TNCN) = tiền cấn trừ thuế thu nhập, gộp các NS → kế toán dịch vụ khai
   05/KK-TNCN hàng tháng/quý (qua eTax).
5. Cột U (Tổng chi phí DN) = số ghi vào sổ chi phí kế toán (TK 6421 Lương + TK
   3383 BH phải nộp). Sau này tự sinh khi có Accounting Phase A trong app.

## Edge case Excel chưa cover

- **NS vào/ra giữa tháng** → tính prorate theo ngày làm việc. Sửa cột E, G manual.
- **Lương BHXH vượt trần** (>46.8tr) → cap cột F = 46,800,000 trước khi formula chạy.
- **NS thử việc** (lương 85% theo Bộ luật LĐ): nhập lương thử việc vào E, BHXH
  cap theo lương thật (F).
- **Thưởng năm 13, thưởng Tết** → cộng vào cột G (tính TNCN), KHÔNG đóng BHXH thêm.
- **Quyết toán năm TNCN** → cuối năm kế toán dịch vụ tổng hợp, NS tự khai nếu có
  thu nhập ngoài EZWAY.

## Khi nào upgrade lên app

Code Payroll Phase C trong EZWAY khi:
- Có 2-3 tháng data lương thật → biết edge case thực tế của NS.
- Số NS >10 → Excel bắt đầu chậm + sai.
- Cần payslip cá nhân (NS xem lương qua app, không qua Excel chung).
- Cần export tự động ra mẫu tờ khai BHXH/TNCN.

Plan đầy đủ ở `docs/accounting-module-plan.md` Phase C.

## Sinh lại file (nếu cần đổi config)

```bash
node scripts/generate-payroll-template.mjs
```

Script ở `scripts/generate-payroll-template.mjs`. Sửa giá trị BHXH %, giảm trừ,
sample data trong script → chạy → ra file mới ở `docs/templates/`.
