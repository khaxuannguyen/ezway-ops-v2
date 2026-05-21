# EZWAY — Refactor vs Rewrite: Implementation Plan

**Date**: 2026-05-17
**Owner**: solo dev (kh8d8ic8@gmail.com)
**Decision**: **HYBRID — new clean Next.js project, port Prisma schema (fixed) + business rules, strangler-fig cutover by module**

## Rationale (1 line)
Scout-01 verdict: app shell rewrite (8/10 severity — no auth, hand-rolled validation, 8 dup helpers, no pagination). Scout-02 verdict: foundation salvageable (schema topology good, Float-vs-Int currency bug, no User/AuditLog/FileAsset, dead mock-data). Codebase is ~2 weeks old, single dev, no production users → Joel-Spolsky-rewrite-is-bad argument does not apply (no tacit knowledge baked in). Clean shell + ported domain is cheaper than refactoring 8 modules of duplicated server actions.

## What's Kept vs Dropped

**KEEP (port verbatim or with minor fixes)**:
- Prisma schema topology (models, relations, indexes) — fix Float→Int currency
- Enums (OrderStatus, PaymentStatus, ServiceType, ShippingTransportType, CostRateType, PickupStatus, etc.)
- `lib/costing.ts` pure math (volumetric, chargeable weight, profit)
- `lib/format.ts` (VND, date, weight formatters)
- `lib/prisma.ts` singleton
- Order code-gen scheme (`XXX-YYMMDD-NNNN`) — consolidate to one helper
- Costing rate weight-bracket data (the 46 rows)
- RSC + server action + `revalidatePath` overall pattern
- Tailwind baseline

**DROP**:
- `lib/mock-data.ts` (309 LOC dead code)
- 8 hand-rolled `getText/getNumber` helpers (replace with Zod + typed action wrapper)
- 5 duplicated code-gen variants (orders/packages/pickups/drivers/customers)
- Client-side filter `useMemo` in 5 modules (replace with server pagination)
- `app/admin/pickups/actions/route.ts` ad-hoc REST handler
- Hardcoded `admin-shell.tsx` nav coupling
- Tailwind utility soup (replace with shadcn/ui + design tokens)
- `querySelector` DOM patches in `orders/new/page.tsx:318-338`

**REDO (UI/UX)**: shadcn/ui primitives, TanStack Table for lists, react-hook-form + zodResolver for forms, design tokens, accessibility pass (WCAG AA), responsive admin shell, error/loading boundaries.

## Phases

| # | Phase | Priority | Status | File |
|---|---|---|---|---|
| 01 | Decision & Foundations (stack picks, scaffolding) | H | not started | [phase-01-decision-and-foundations.md](./phase-01-decision-and-foundations.md) |
| 02 | Domain & Schema Port (fix Float→Int, add User/AuditLog/FileAsset) | H | not started | [phase-02-domain-and-schema-port.md](./phase-02-domain-and-schema-port.md) |
| 03 | Shared Foundations (action wrapper, codegen util, Field, auth middleware, env validation) | H | not started | [phase-03-shared-foundations.md](./phase-03-shared-foundations.md) |
| 04 | Module Port — Orders, Customers, Packages | H | not started | [phase-04-module-port-orders-customers-packages.md](./phase-04-module-port-orders-customers-packages.md) |
| 05 | Module Port — Services, Cost-Rates, Cost-Items | M | not started | [phase-05-module-port-services-costs.md](./phase-05-module-port-services-costs.md) |
| 06 | Module Port — Pickups, Drivers | M | not started | [phase-06-module-port-pickups-drivers.md](./phase-06-module-port-pickups-drivers.md) |
| 07 | UI/UX Refresh (tokens, a11y, shell, shared primitives) | M | not started | [phase-07-ui-ux-refresh.md](./phase-07-ui-ux-refresh.md) |
| 08 | Cutover & Deprecation (strangler-fig, data migration, archive) | H | not started | [phase-08-cutover-and-deprecation.md](./phase-08-cutover-and-deprecation.md) |

## Ordering Notes
- 01 → 02 → 03 strictly sequential (foundation).
- 04, 05, 06 can run in any order after 03; suggested 04 first (highest traffic).
- 07 can run in parallel with module ports (primitives need design system in 03 first).
- 08 last.

## Resolved Decisions (locked 2026-05-17)
1. **Users**: MVP internal only. No real prod users → free to reset DB. Cutover = Mode A (clean cutover).
2. **Mobile driver**: Yes, but responsive web / PWA — NOT native. Driver portal at `/(driver)/*` with own auth role.
3. **Multi-tenant**: Not yet. Single-tenant for now. No `tenantId` column added; revisit only if SaaS direction confirmed.
4. **E-invoice (GDT)**: Deferred. AuditLog included; e-invoice export module is post-MVP.
5. **Storage**: **Cloudflare R2** primary target. FileAsset abstraction designed for it. MVP can stub with local URL.
6. **Budget**: Lean — free/low-cost tiers. Better Auth (free, self-host), Supabase or Neon free, Cloudflare R2/Pages free.
7. **DB**: Dev = SQLite acceptable. **Production = PostgreSQL (Supabase)**. Schema must stay Postgres-compatible (no SQLite-only types).
8. **Pickups `route.ts`**: Tech debt from rushed AI build. Delete. Replace with Server Actions. Driver portal handled via its own routes, not this endpoint.
