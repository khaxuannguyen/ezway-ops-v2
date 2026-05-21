# Phase 04 — Module Port: Orders, Customers, Packages

## 1. Context
- Parent: [plan.md](./plan.md)
- Depends on: phase-01, 02, 03
- Source: [scout/scout-01-admin-modules.md §1,§2,§3](./scout/scout-01-admin-modules.md)

## 2. Overview
- Date: 2026-05-17
- Description: First migration wave. Port three highest-traffic modules using new foundations. Establish module-port template for phases 05-06.
- Priority: H
- Implementation status: not started
- Review status: pending

## 3. Key Insights
- Orders is largest module (~1500 LOC across 5 files) and worst offender: 8 helper functions, 30+ LOC inline codegen, 6 form action variants in detail page, querySelector DOM patches at `app/admin/orders/new/page.tsx:318-338`.
- Customers has N+1 (`page.tsx:8-21` orders { payments }) and revenue/debt math in RSC render.
- Packages duplicates weight math (`actions.ts:70` vs orders' `actions.ts:202`).
- All three list pages load full table then client-filter — replace with DataTable + server pagination.
- Orders detail page has 6 form action variants — collapse to small set of `defineAction` calls.

## 4. Requirements

**Functional**
- Orders: list (paginated), new (single form, no DOM hacks), detail (status update, payment add, extra cost add, package add, edit, cancel — all via `defineAction`).
- Customers: list (paginated, server search), new, detail (revenue/debt via aggregate query, not in render), edit.
- Packages: list (paginated), new (order picker with server-side search, not "load all"), detail, edit.
- All forms use react-hook-form + zodResolver + `<Field>`.
- All mutations atomic — order+customer creation in single `$transaction`; status update + tracking event in single tx.
- All codes generated via `lib/codegen.ts`.

**Non-functional**
- Server pagination (page, pageSize, sort, filter via URL).
- Each list ≤ 50 rows initial; sortable headers.
- Each module: 1 happy-path Playwright smoke (create entity → appears in list).
- Each module: Zod schema co-located in `features/<mod>/schemas.ts`.
- Zero `useMemo` filter on `client.tsx` files.

## 5. Architecture

### Per-module structure
```
features/orders/
  schemas.ts          # Zod: createOrderSchema, updateOrderStatusSchema, addPaymentSchema...
  queries.ts          # listOrders, getOrder (Prisma)
  actions.ts          # defineAction wrappers
  components/
    order-table.tsx       # DataTable column defs
    order-form.tsx        # RHF form (create + edit)
    order-status-form.tsx
    payment-form.tsx
    extra-cost-form.tsx
  constants.ts        # status labels, etc.

app/(admin)/orders/
  page.tsx            # thin: parse URL params, call queries.listOrders, render OrderTable
  new/page.tsx        # thin: render OrderForm
  [id]/page.tsx       # thin: queries.getOrder, render detail + sub-forms
  [id]/edit/page.tsx
```

### Query contracts (queries.ts)
```ts
listOrders(input: ListOrdersInput): Promise<{ rows, total, page, pageSize }>
getOrder(id: string): Promise<OrderDetail>   // single query w/ relations
```

### Action contracts (actions.ts) — uniform
```ts
createOrder        = defineAction({ schema: createOrderSchema, handler })
updateOrder        = defineAction(...)
updateOrderStatus  = defineAction(...)   // writes status + TrackingEvent atomically
cancelOrder        = defineAction(...)
addPayment         = defineAction(...)
addExtraCost       = defineAction(...)
removeExtraCost    = defineAction(...)
```

All return `ActionResult`; pages use `useActionState` + RHF.

## 6. Related Code Files (old repo)
- `app/admin/orders/page.tsx:8-23` — list (replace include with paged query)
- `app/admin/orders/actions.ts:1-512` — extract logic, drop helpers
- `app/admin/orders/orders-client.tsx:1-93` — drop client filter
- `app/admin/orders/new/page.tsx:40-341` — full rewrite as RHF, remove L318-338 querySelector
- `app/admin/orders/[id]/page.tsx:26-668` — split into detail + sub-forms
- `app/admin/orders/[id]/edit/page.tsx` — convert to RHF
- `app/admin/customers/page.tsx:8-21` — replace N+1 include with aggregate
- `app/admin/customers/actions.ts:1-130` — drop manual email regex (Zod `.email()`)
- `app/admin/customers/customers-client.tsx:1-135` — drop client filter
- `app/admin/customers/[id]/page.tsx:36-41` — move revenue/debt to `queries.getCustomerWithStats`
- `app/admin/packages/page.tsx:8-24` — replace N+1
- `app/admin/packages/actions.ts:1-170` — drop weight dup, import from `lib/costing/pure.ts`
- `app/admin/packages/new/page.tsx:30-120` — replace "load all orders" with searchable combobox

## 7. Implementation Steps
1. Define Zod schemas in `features/orders/schemas.ts`: `createOrderSchema`, `updateOrderStatusSchema`, `addPaymentSchema`, `addExtraCostSchema`. Currency fields are Int (`z.coerce.number().int().nonnegative()`).
2. Implement `features/orders/queries.ts` — `listOrders` accepts `{ page, pageSize, search, status, dateFrom, dateTo, sort }`; returns Prisma select with only needed columns.
3. Implement `features/orders/actions.ts` — all 7 actions via `defineAction`. `updateOrderStatus` writes TrackingEvent + AuditLog in same `$transaction`. `createOrder` creates customer (find-or-create) + order in tx.
4. Build `OrderTable` using shared DataTable. Server filters bound to URL params.
5. Build `OrderForm` (create + edit unified) using RHF. Replace querySelector hacks with proper RHF state.
6. Refactor `[id]/page.tsx` — RSC fetches via `getOrder`; sub-forms (`OrderStatusForm`, `PaymentForm`, `ExtraCostForm`) are client components consuming actions.
7. Repeat for Customers:
   - `schemas.ts`: createCustomerSchema (email via Zod `.email()`, no manual regex).
   - `queries.ts`: `listCustomers`, `getCustomerWithStats` using `customer.aggregate` for revenue/debt.
   - Drop `customers-client.tsx`.
8. Repeat for Packages:
   - `schemas.ts`: createPackageSchema.
   - `queries.ts`: `listPackages`, `getPackage`.
   - Order picker: shadcn Command/Combobox with server-side search action returning top 20.
   - Weight calc imports `lib/costing/pure.ts` — no local copy.
9. Playwright smoke test per module: login → create entity → see in list.
10. Vitest: schema unit tests (valid + invalid cases).
11. Run `pnpm typecheck` + `pnpm lint` clean.
12. Manual QA pass: create order with new customer; verify AuditLog row written; verify totals = Int đồng exactly.

## 8. Todo
- [ ] Orders schemas
- [ ] Orders queries (paginated)
- [ ] Orders actions (7)
- [ ] OrderTable + OrderForm + sub-forms
- [ ] Orders detail page
- [ ] Customers schemas + queries + actions
- [ ] Customer revenue/debt via aggregate
- [ ] Customers list + forms
- [ ] Packages schemas + queries + actions
- [ ] Order combobox (searchable)
- [ ] Package list + forms
- [ ] Playwright smoke per module
- [ ] Vitest schema tests

## 9. Success Criteria
- All 3 modules rendered using DataTable with URL-driven pagination.
- Zero `useMemo` client filter remaining in these modules.
- Each `actions.ts` < 200 LOC (vs 512 in old orders).
- `grep -r "getText\|getNumber" features/orders features/customers features/packages` → 0.
- Single weight-calc source (`lib/costing/pure.ts`).
- All currency display + storage uses Int đồng; no Float anywhere.
- AuditLog populated for every create/update/cancel.

## 10. Risk Assessment
| Risk | Mitigation |
|---|---|
| Orders detail complexity creates RHF tangle | Split into 5 small sub-forms, each with own RHF instance |
| Customer find-or-create race (two simultaneous creates) | Unique index on `Customer.phone` or `email`; tx + `upsert` |
| Searchable order combobox slow on large dataset | Debounce 250ms; limit 20; index on `Order.code` |
| AuditLog doubles write count, hurts perf | Acceptable for admin app; revisit if dashboard latency > 1s |
| Forms regress vs current behavior | Side-by-side dev/prod test before deprecating old routes |

## 11. Security Considerations
- All actions check `requireRole(["ADMIN","STAFF"])` via `defineAction.authorize`.
- Customer PII (phone, address) never logged to console; AuditLog stores JSON only in DB.
- Zod schemas trim + sanitize string inputs.
- Order totals recomputed server-side from line items; client-submitted totals ignored.
- Cancel order requires explicit status precondition (cannot cancel DELIVERED).

## 12. Next Steps
Proceed to [phase-05-module-port-services-costs.md](./phase-05-module-port-services-costs.md).
