# UI Polish Plan — Linear-style design system

> **Status:** Brief đã consensus (2026-05-30). Chưa implement code (ngoài fix typo dashboard).
> **Approach:** A — Quick polish 2-4 ngày, design token + audit, KHÔNG redesign.
> **Reference:** Linear (linear.app) — dense, dark accent, keyboard-first.
> **Budget:** 4 ngày dev. Internal tool (~5 user), không over-engineer.

## 1. Problem statement

UI hiện tại "chưa xịn" theo feedback:
- Layout / spacing không nhất quán
- Màu sắc + badge + status rối, thiếu brand identity
- Form + bảng + typography yếu
- Cảm giác chung không đủ chuyên nghiệp
- Font render dấu tiếng Việt nét xấu (Windows Segoe UI default)

## 2. Evaluated approaches

| Approach | Effort | ROI internal tool | Risk |
|---|---|---|---|
| **A. Polish pass — design token + audit** | 2-4 ngày | ⭐⭐⭐⭐⭐ | Thấp — incremental |
| **B. Redesign Linear** (dense + cmd-K) | 1-2 tuần | ⭐⭐⭐⭐ | Medium — rebuild navigation |
| **C. Full redesign** (theme + layout + motion) | 3-4 tuần | ⭐⭐ | Cao — rewrite, ít user hưởng lợi |
| **D. Component lib swap** (AG-Grid, etc.) | 2-3 tuần | ⭐⭐⭐ | Medium — lib mới |

**Chọn:** A — high ROI / low risk cho internal tool 5 user.

## 3. Final solution — Linear-style polish

### Brand identity (LOCKED)
- **Logo:** wordmark navy + máy bay silver gradient + tagline "Moving Made Easy"
- **Primary navy** (eyeball từ logo, đủ dùng): `#1E2F5E`
- **Accent silver** (từ máy bay): `#A0AAB8`

### Design tokens

```
Primary scale (navy):
  primary-900  #14213D    sidebar bg, dark heading
  primary-700  #1E2F5E    ← BRAND CHÍNH (button, link)
  primary-500  #3949A0    hover state
  primary-300  #8895C7    subtle accent, focus ring
  primary-100  #E8EBF5    background tint, selected row
  primary-50   #F4F6FB    very subtle

Accent (silver từ logo plane):
  silver-400   #A0AAB8    subtle hover ring, divider sharp

Semantic (giữ chuẩn Tailwind):
  success      #10B981
  warning      #F59E0B
  destructive  #EF4444
  info         #3B82F6   (khác hẳn primary navy nên OK)
```

### Typography
- **Primary font:** Geist Sans (Vercel, free, geometric, **support tiếng Việt tốt hơn Segoe UI mặc định**)
- **Mono font:** Geist Mono (cho mã `EZW-...`, `CUS-...`, `PK-...`)
- **Scale:** 5 levels (h1 / h2 / h3 / body / caption) — chốt config Tailwind
- **Wordmark logo:** giữ raster image, không cần web font

### Spacing
- Chỉ dùng Tailwind scale: `1 / 2 / 3 / 4 / 6 / 8 / 12 / 16`
- Border radius nhất quán: chọn 1 trong `rounded-md` (6px) hoặc `rounded-lg` (8px) — sẽ pick lúc Day 1
- Shadow scale: 3 cấp `sm` / `md` / `lg`

## 4. Implementation phases

### Day 1 — Foundation (design tokens)
- [ ] Lock brand color → derive scale (50-900) cho primary
- [ ] Tailwind config: thêm `primary-*`, `silver-*` tokens
- [ ] Semantic tokens cleanup: cắt palette từ ~10 màu xuống 6 (4 semantic + primary + silver)
- [ ] Typography config: add Geist Sans + Geist Mono qua `next/font`, set type scale
- [ ] Spacing/radius/shadow tokens (chuẩn hoá scale)
- [ ] Verify render tiếng Việt với Geist trên Chrome/Firefox/Edge

### Day 2 — Core components
- [ ] `Badge`: refactor toàn bộ status badge dùng `tone` nhất quán
- [ ] `Button`: hover/focus/disabled state Linear-grade (transition 150ms, ring focus subtle)
- [ ] `Input/Select/Textarea`: focus ring tinh tế (`ring-2 ring-primary/50`)
- [ ] `Card`: shadow + border refine
- [ ] `Table`: density compact, hover row, sticky header, **monospace cho cột mã**

### Day 3 — Layout + identity
- [ ] Sidebar: Linear-style polish (section divider sắc nét, icon stroke nhất quán, hover subtle)
- [ ] Topbar: thêm logo EZWAY (wordmark trắng/silver trên dark) + user menu polish
- [ ] Login page: refresh với logo + gradient subtle
- [ ] `EmptyState` generic component (icon + title + description + CTA optional)

### Day 4 — Page polish + Vietnamese audit
- [ ] Dashboard: refine stat cards (number monospace + tabular-nums, trend indicator)
- [ ] /admin/orders list: filter bar refine, badge density tăng
- [ ] /admin/orders/new form: section divider rõ, label hierarchy
- [ ] Vietnamese text audit:
  - Grep typo còn lại (`hiau`, `tành`, mojibake, brand `EZWay` vs `EZWAY`)
  - Verify `lang="vi"` trong `<html>`
  - Verify `Intl.NumberFormat("vi-VN")` cho tiền/số/ngày
  - Cross-browser font render

### Cắt (defer v2)
- Command palette (Cmd-K) — cần 1-2 ngày + lib `cmdk`
- Dark mode toggle — chưa có demand
- Custom illustrations — cost + maintenance cao
- Heavy animations / motion design — chậm workflow

## 5. Success criteria

- ✅ Consistent spacing (audit không còn padding lạc loài)
- ✅ Palette 6 màu tối đa (4 semantic + primary + silver)
- ✅ Typography 5 levels rõ ràng, mono cho codes
- ✅ Sidebar/topbar có logo EZWAY visible
- ✅ Dashboard stat cards "look professional" (tabular-nums + trend indicator)
- ✅ 0 typo Vietnamese cấp UI (đã grep audit)
- ✅ Font render dấu tiếng Việt clean trên Chrome + Firefox + Edge
- ✅ Build pass + không regression test workflow

## 6. Risks

| Risk | Mitigation |
|---|---|
| Design token đổi → spacing/color regression nhiều page | Test từng page sau Day 1; commit nhỏ |
| Geist font 200KB+ load lần đầu | Self-host qua `next/font` (auto-optimize) |
| Linear-style dense quá → user 50+ tuổi khó đọc | Body text giữ 14px+, line-height đủ; KHÔNG xuống 12px |
| Brand color `#1E2F5E` chỉ eyeball — không pixel-perfect | OK cho v1; có thể chỉnh sau khi user thấy preview |

## 7. Dependencies / prerequisites

- ✅ Logo: user đã cung cấp
- ✅ Brand color: locked `#1E2F5E` (derived)
- ❓ User cung cấp font hex chính xác nếu muốn pixel-perfect (optional)
- ❓ User decide: `rounded-md` hay `rounded-lg` (Day 1 pick)

## 8. Out of scope

- Mobile responsive deep polish (driver portal đã làm mobile-first riêng)
- Accessibility audit WCAG AA (giữ baseline, không deep dive)
- i18n English (app Vietnamese only)
- A/B testing (5 user — không meaningful)

## 9. Next steps

1. **Đã làm:** Fix 7 typo Vietnamese cấp UI (dashboard + brand consistency)
2. **Đợi user confirm:** start Day 1 phase (token + Tailwind config)
3. **Sau Day 1:** preview 1-2 page (dashboard + orders list) để user feedback trước khi tiếp Day 2

---

**Decision log:**
- 2026-05-30: Brainstorm consensus. Approach A locked. Cmd-K defer v2. Brand color guess `#1E2F5E`.
- 2026-05-30: Phát hiện 7 typo Vietnamese (5 dashboard hint + 1 "xấy hiện" + 1 brand `EZWay`). Fix ngoài brainstorm scope.
