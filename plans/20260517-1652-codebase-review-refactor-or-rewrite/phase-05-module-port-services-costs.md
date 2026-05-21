# Phase 05 — Module Port: Services, Cost-Rates, Cost-Items

## 1. Context
- Parent: [plan.md](./plan.md)
- Depends on: phase-03 (foundations), phase-04 (template established)
- Source: [scout/scout-01-admin-modules.md §4,§5,§6](./scout/scout-01-admin-modules.md)

## 2. Overview
- Date: 2026-05-17
- Description: Port services catalog, cost-rates (per-weight-bracket pricing), and cost-items (extra-cost dictionary). Highlight: kill the 46-input Excel-paste form.
- Priority: M
- Implementation status: not started
- Review status: pending

## 3. Key Insights
- `app/admin/cost-rates/new/cost-rate-new-form.tsx:39-266` is a 227-LOC client form with 46 `useState` inputs and an Excel-paste parser (`L74-91`) — replace with editable TanStack grid.
- 46 weight-bracket rows defined twice: hardcoded in `app/admin/cost-rates/actions.ts:30-77` AND in a `weight-rows.ts` file — consolidate to single source.
- `cost-rates/page.tsx:53-58` computes `latestUpdatedAt` in a render loop → N additional queries; replace with `max(updatedAt)` aggregate.
- `services/actions.ts:1-110` uses `isActive == "on"` fragile string check; Zod's `z.coerce.boolean()` or `z.literal("on").transform(...)`.
- `cost-items/new/page.tsx:1-20` and `[id]/edit/page.tsx:8-30` cram all form controls into one line — UX needs proper field stacking.
- `ServiceCostRate.amount` and `CostItem.defaultAmount` were Float — must be Int (fixed in phase 02).

## 4. Requirements

**Functional**
- Services: CRUD with type/transport-type selects driven by enum.
- Cost-rates: per-service editable grid (weight bracket × cost rate). Bulk edit via in-grid input cells, not 46 separate `useState`. Optional CSV import as enhancement (deferred).
- Cost-items: simple CRUD for the extra-cost dictionary used in orders.
- All money fields Int.
- Latest-updated-at via single aggregate, not per-row query.

**Non-functional**
- Cost-rate grid: keyboard-navigable (arrow keys + tab) and persists row-by-row via debounced action OR explicit Save.
- Weight-bracket list = single constant in `features/cost-rates/constants.ts`.
- Forms via RHF; bulk grid is a controlled table component.

## 5. Architecture

### Cost-rate grid (replacement for 46-input form)
```
features/cost-rates/components/cost-rate-grid.tsx
  ├─ TanStack Table editable cells (CurrencyInput per cell)
  ├─ RHF useFieldArray bound to rows
  ├─ Single submit → upsertMany action wrapped in $transaction
  └─ CSV paste handler (optional, P2) parses TSV/CSV into rows
```

### Folder layout
```
features/services/
  schemas.ts
  queries.ts
  actions.ts
  components/service-form.tsx
features/cost-rates/
  schemas.ts        # bracketRowSchema, upsertRatesSchema (array)
  queries.ts        # listRates(serviceId), getLatestUpdatedAt(serviceId)
  actions.ts        # upsertRates (bulk), deleteRate
  constants.ts      # WEIGHT_BRACKETS (46 rows) — SINGLE SOURCE
  components/cost-rate-grid.tsx
features/cost-items/
  schemas.ts
  queries.ts
  actions.ts
  components/cost-item-form.tsx
```

## 6. Related Code Files (old repo)
- `app/admin/services/page.tsx:8-30`
- `app/admin/services/actions.ts:1-110` (drop `"on"` check)
- `app/admin/services/services-client.tsx:1-187` (drop)
- `app/admin/services/new/page.tsx:4-100`
- `app/admin/services/[id]/edit/page.tsx:9-125`
- `app/admin/cost-rates/page.tsx:8-123` (fix latestUpdatedAt L53-58)
- `app/admin/cost-rates/actions.ts:1-210` (consolidate DEFAULT_COST_RATE_ROWS L30-77)
- `app/admin/cost-rates/cost-rates-client.tsx:1-124`
- `app/admin/cost-rates/new/cost-rate-new-form.tsx:39-266` (full rewrite as grid; salvage Excel-paste logic L74-91 as optional handler)
- `app/admin/cost-rates/weight-rows.ts` (consolidate with above)
- `app/admin/cost-items/page.tsx:9-76`
- `app/admin/cost-items/actions.ts:1-55`
- `app/admin/cost-items/new/page.tsx:1-20`
- `app/admin/cost-items/[id]/edit/page.tsx:8-30`

## 7. Implementation Steps
1. **Services**:
   - Zod schemas + queries + actions following phase-04 template.
   - Enum-driven selects via `Object.values(ServiceType).map`.
   - Replace `isActive=="on"` with `z.coerce.boolean()`.
   - Drop services-client.tsx; use DataTable.
2. **Cost-items**:
   - Schemas + queries + actions.
   - Reformat new/edit page using `<Field>` for proper stacking.
   - `defaultAmount` is Int VND.
3. **Cost-rates**:
   - Move `WEIGHT_BRACKETS` to `features/cost-rates/constants.ts` (single source).
   - `queries.listRates(serviceId)` returns rates indexed by bracket; missing brackets default to null.
   - `queries.getLatestUpdatedAt` uses `prisma.serviceCostRate.aggregate({ _max: { updatedAt: true }, where: { serviceId }})`.
   - Build `CostRateGrid` using TanStack Table editable cells. RHF `useFieldArray` for state. CurrencyInput per cell.
   - `actions.upsertRates` accepts `{ serviceId, rates: BracketRow[] }`, validates with Zod, single `$transaction` doing `deleteMany` then `createMany` (or per-row upsert).
   - Optional Excel-paste: parse TSV/CSV in client, push rows to form state; defer if time-boxed.
4. Playwright smoke: create service → set 46 brackets via grid → verify list page shows latest-updated-at.
5. Vitest: Zod schema tests; bracket-count assertion (must be exactly 46).
6. Manual QA: verify all rate amounts persist as Int; verify findServiceCostRate (used in order creation phase 04) still returns correct rate.

## 8. Todo
- [ ] Services CRUD ported
- [ ] services-client.tsx dropped
- [ ] Cost-items CRUD ported with proper form layout
- [ ] WEIGHT_BRACKETS single source
- [ ] Cost-rate grid (TanStack + RHF useFieldArray)
- [ ] latestUpdatedAt aggregate query
- [ ] upsertRates atomic action
- [ ] Optional CSV/TSV paste
- [ ] Playwright smoke
- [ ] Vitest schema tests

## 9. Success Criteria
- Cost-rate new/edit page < 150 LOC (vs 227).
- Zero hardcoded weight-bracket rows outside `constants.ts`.
- `findServiceCostRate` (used by orders) still works post-port.
- Service list page renders < 200ms (no N+1 latestUpdatedAt loop).
- All `*.amount` and `*.defaultAmount` fields are Int in DB and UI.

## 10. Risk Assessment
| Risk | Mitigation |
|---|---|
| Editable grid keyboard nav buggy on Vietnamese IME | Test on Windows IME early; fall back to per-row Save if grid mode fails |
| Bulk upsert tx times out on 46 rows | Use `createMany` (single SQL); benchmark in dev |
| Excel paste deferred → user workflow broken | If user relies on paste, keep it as P1; otherwise defer |
| Schema constant drift if old `weight-rows.ts` re-imported | Old repo is reference-only; new repo never imports across boundary |
| Currency Int conversion misses cents-leftover from old Float | Phase 02 already rounds; verify via row-count + sum reconciliation |

## 11. Security Considerations
- Service + cost-rate edits are admin-only (`requireRole("ADMIN")`).
- Bulk upsert validates each row via Zod before tx; rejects entire batch on any invalid row.
- Cost-item amount cap (reasonable max) to prevent typo causing wild order totals.
- AuditLog row per upsert batch (one log entry, not 46).

## 12. Next Steps
Proceed to [phase-06-module-port-pickups-drivers.md](./phase-06-module-port-pickups-drivers.md).
