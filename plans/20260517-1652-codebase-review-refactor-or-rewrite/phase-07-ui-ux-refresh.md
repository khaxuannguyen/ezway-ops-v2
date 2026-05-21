# Phase 07 — UI/UX Refresh

## 1. Context
- Parent: [plan.md](./plan.md)
- Depends on: phase-03 (shadcn primitives + base shell). Can run in parallel with phases 04-06.
- Source: [scout/scout-02-shared-infra.md §2](./scout/scout-02-shared-infra.md), [scout/scout-01-admin-modules.md "Error/loading"](./scout/scout-01-admin-modules.md)

## 2. Overview
- Date: 2026-05-17
- Description: Design tokens, accessibility pass, responsive admin shell, unified ProcessFlow + StatusBadge, internal design-system reference page. No new features — visual + a11y consistency only.
- Priority: M
- Implementation status: not started
- Review status: pending

## 3. Key Insights
- Tailwind utility soup — colors hardcoded (`emerald-50`, `blue-50`) across components → re-branding requires global find/replace (scout-02 §2).
- `status-badge.tsx` (175 LOC) mixes 3 status domains + 6 variants in one file — split per domain (already planned in phase-03).
- `order-process-flow.tsx` + `pickup-process-flow.tsx` share adapter shape — extract `ProcessFlowAdapter<TStatus>`.
- A11y is minimal: no aria-*, native semantics only, no keyboard nav testing.
- No `error.tsx`, no `loading.tsx`, no skeleton states (scout-01 "Error/loading").
- `admin-shell.tsx` is client comp with hardcoded 9-route nav — replace with data-driven nav + Sheet drawer for mobile.

## 4. Requirements

**Functional**
- Design tokens defined once in `app/globals.css` + `tailwind.config.ts` (extend theme).
- Light + dark mode supported (toggleable; default light).
- Responsive admin shell: sidebar on ≥md, Sheet drawer on <md.
- Per-route `loading.tsx` skeleton; global `error.tsx`.
- Empty-state component used in every list when zero rows.
- `/internal/design-system` route (gated to admin) showing Buttons/Inputs/Tables/Badges/EmptyStates/ProcessFlow for visual QA.

**Non-functional**
- Lighthouse Accessibility ≥ 90 on `/admin/orders`, `/admin/pickups`.
- All interactive elements keyboard-reachable + visible focus ring.
- All form fields have associated `<label>` (Field primitive enforces).
- Color contrast WCAG AA on all text + status badges.
- Reduced-motion preference respected for ProcessFlow animations.

## 5. Architecture

### Design tokens
```css
/* globals.css */
:root {
  --color-bg: ...;
  --color-surface: ...;
  --color-fg: ...;
  --color-muted: ...;
  --color-primary: ...;  /* EZWAY brand */
  --color-success: ...;
  --color-warning: ...;
  --color-danger: ...;
  --color-info: ...;
  --radius: 0.5rem;
}
.dark { ... }
```
- Tailwind `theme.extend.colors` aliases the CSS vars → utilities like `bg-surface`, `text-muted`.

### StatusBadge split (per phase-03)
```
components/data/
  status-badge.tsx              # generic <StatusBadge tone="success|warning|...">
  order-status-badge.tsx        # maps OrderStatus → tone + label
  pickup-status-badge.tsx
  payment-status-badge.tsx
```

### ProcessFlow adapter
```ts
// components/data/process-flow-adapter.ts
type FlowNode<T> = { status: T; label: string; tone: Tone }
function makeFlow<T extends string>(definition: FlowDef<T>): FlowNode<T>[]

// usage
const ORDER_FLOW = makeFlow<OrderStatus>({ NEW: {...}, CONFIRMED: {...}, ... })
const PICKUP_FLOW = makeFlow<PickupStatus>({ PENDING: {...}, ... })
```

### Admin shell
```
components/shell/admin-shell.tsx
  ├─ NAV_ITEMS data array
  ├─ Sidebar (md+)
  ├─ Sheet drawer (sm)
  ├─ User menu (avatar → sign out)
  └─ Breadcrumbs (computed from pathname)
```

### Loading/Error
- `app/(admin)/loading.tsx` (segment-level skeleton)
- `app/(admin)/error.tsx` (reset boundary)
- `app/(admin)/orders/loading.tsx` (table skeleton)
- Per-list `EmptyState` component when 0 rows.

## 6. Related Code Files (old repo)
- `components/admin-shell.tsx:1-82` (replace)
- `components/page-header.tsx` (keep — already clean)
- `components/info-card.tsx` (keep)
- `components/status-badge.tsx:1-175` (split)
- `components/order-table.tsx:1-155` (replaced by DataTable column defs)
- `components/timeline.tsx` (keep — generic)
- `components/process-flow.tsx`, `order-process-flow.tsx`, `pickup-process-flow.tsx` (consolidate with adapter)
- `lib/format.ts:1-33` (keep)

## 7. Implementation Steps
1. Define CSS variable tokens in `globals.css`; extend tailwind theme. Document in `docs/design-tokens.md`.
2. Implement dark mode via `class` strategy + theme toggle (shadcn pattern).
3. Audit all colors used across ported modules; replace hardcoded `emerald-*`/`blue-*` with semantic `bg-success/10`, `text-success`, etc.
4. Finalize `status-badge.tsx` split (started in phase-03). Each domain badge uses generic `<StatusBadge>` + domain-specific label/tone map.
5. Build `ProcessFlowAdapter` + migrate order + pickup flows to use it.
6. Build data-driven `AdminShell` with Sheet drawer for mobile + breadcrumbs.
7. Add `loading.tsx` skeletons per list route (orders, customers, packages, pickups, drivers, services, cost-rates, cost-items).
8. Add global + segment `error.tsx` boundaries.
9. Build `EmptyState` component; integrate in all DataTable wrappers.
10. Build `/internal/design-system` route — single page rendering each primitive + each badge variant + each empty state. Admin-gated.
11. Run Lighthouse + axe-core CLI on `/admin/orders` + `/admin/pickups`; fix violations until score ≥ 90.
12. Add `prefers-reduced-motion` respect to ProcessFlow + DataTable transitions.
13. Add `<title>` + meta to each admin route via Next 15 metadata API.

## 8. Todo
- [ ] Design tokens in globals.css + tailwind
- [ ] Dark mode toggle
- [ ] Hardcoded color sweep
- [ ] StatusBadge split (3 domains)
- [ ] ProcessFlowAdapter
- [ ] AdminShell data-driven + responsive
- [ ] loading.tsx skeletons (8 routes)
- [ ] error.tsx boundaries
- [ ] EmptyState in every list
- [ ] /internal/design-system page
- [ ] Lighthouse ≥ 90 verified
- [ ] axe-core 0 violations on key routes
- [ ] Reduced-motion respected
- [ ] Page metadata set

## 9. Success Criteria
- Re-branding (changing primary color) requires editing ≤ 3 files.
- Lighthouse Accessibility ≥ 90 on orders + pickups routes.
- axe-core CLI 0 violations on those routes.
- All list pages render a skeleton during navigation.
- All errors caught by `error.tsx` (no white screen).
- All forms keyboard-navigable end-to-end.

## 10. Risk Assessment
| Risk | Mitigation |
|---|---|
| Dark mode adds maintenance overhead | Defer if behind schedule; tokens alone enable later |
| A11y sweep blocks module ports | Run in parallel; treat as P2 polish |
| Design tokens churn during module ports | Lock tokens by end of phase-03; only add new ones (no rename) |
| Process-flow generic abstraction over-engineered | Cap at 2 concrete consumers (orders, pickups); refactor only if 3rd appears |
| Hardcoded color sweep misses some files | Add ESLint rule banning `bg-emerald-*`/etc; will surface remaining usages |

## 11. Security Considerations
- `/internal/design-system` route gated to ADMIN role; not public.
- No PII shown in design system mock data.
- Reduced-motion respect avoids vestibular triggers (a11y compliance).
- Focus rings visible — required for keyboard-only users (sometimes screen-reader users), also good practice for security audit context.

## 12. Next Steps
Proceed to [phase-08-cutover-and-deprecation.md](./phase-08-cutover-and-deprecation.md).
