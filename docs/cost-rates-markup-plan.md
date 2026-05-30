# Cost-rates markup workflow — brief

> Brainstorm consensus 2026-05-30. Approach A (markup live, transient).
> Implementation tracker: 7 tasks, ~6-8 giờ.

## Problem
Carrier (Kango/KSN/Go) gửi bảng giá gốc (cost). Admin EZWAY phải tự cộng margin tay 41 mốc → mất time, dễ sai, margin không nhất quán.

## Solution
Modal "Markup theo dải cân" tích hợp vào `/admin/cost-rates/new` + `[id]/edit`:
- Paste giá carrier (tính năng có sẵn)
- Mở modal markup → cấu hình multi-range (vd 0-5kg +30%, 5-20kg +20%, 20+kg +15%)
- Live preview bảng sell price
- Apply → fill vào form input
- User fine-tune nếu cần → Save

## Decisions locked

| Decision | Locked |
|---|---|
| Markup type | Multi-range theo dải cân (linh hoạt nhất, EZWAY có margin khác cho đơn nhỏ vs đơn lớn) |
| Rounding | Làm tròn 1,000 VNĐ (ceil) |
| Save cost gốc | KHÔNG (Option A thuần — overwrite sell, không track cost history) |
| Format số live | CÓ — `MoneyInput` thousand separator on type |
| Markup persist | localStorage cache per service-id (gợi ý ranges cũ lần sau, KHÔNG lưu DB) |

## Tasks (~6-8 giờ)

| # | Task | Estimate |
|---|---|---|
| 1 | `lib/cost-rates/markup.ts` — pure `applyMarkupRanges(prices, ranges, rounding)` + validation contiguous | 1h |
| 2 | `components/ui/money-input.tsx` — format thousand live (`Intl.NumberFormat`) + caret handling | 1.5h |
| 3 | Component `MarkupModal` — multi-range editor + live preview table + apply button | 2h |
| 4 | Tích hợp `MarkupModal` vào `CostRateBulkForm` cạnh paste textarea | 1h |
| 5 | Replace toàn bộ `Input type="number"` giá tiền trong form cost-rates → `MoneyInput` | 1h |
| 6 | `localStorage` persist markup ranges per service-id | 30 phút |
| 7 | TS + smoke + commit + push | 1h |

## Risks

| Risk | Mitigation |
|---|---|
| Multi-range gap/overlap | Auto-validate contiguous, warning đỏ |
| Carrier có mốc ngoài coverage (vd 999kg) | Default last range max = `OPEN_ENDED_MAX` (9999) |
| `MoneyInput` caret jumping | Test kỹ Firefox/Chrome/Edge, fallback `defaultValue` |
| User quên markup → submit giá carrier | Banner cảnh báo heuristic (giá < avg carrier price) — defer v2 |

## Out of scope (defer v2)

- Track cost vs sell history (Option B — schema thêm `costAmountVnd`) → chờ 3-6 tháng đánh giá
- Markup tự động khi carrier đổi giá → quá sớm
- Margin dashboard profit per service → khi có data thật

## Success criteria

- Admin paste giá → 1-click markup → save bảng giá xong trong < 1 phút (vs hiện ~5-10 phút nhập tay)
- 41 mốc không cần touch tay nếu markup formula phù hợp
- Margin nhất quán (tránh sai số do gõ tay)
- Money input hiển thị format `1,234,567 đ` → user thấy ngay sai số
