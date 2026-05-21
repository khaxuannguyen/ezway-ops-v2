# Scout 02 — Shared Infrastructure & Schema Audit

Verdict (foundation layer): **MOSTLY SALVAGEABLE**. Schema design is sound; tooling is weak; mock code is dead.

## 1. Prisma Schema

- **DB**: SQLite, indexes on Order/PickupRequest/Customer hot paths. Fine for MVP (<50k rows). Concurrency + reporting will push toward Postgres.
- **Money inconsistency (CRITICAL)**: `Order.baseFee`, `Order.surchargeFee`, `Order.discountFee`, `Order.totalFee`, `Payment.amount` = `Int`. `Order.baseCost`, `Order.extraCostTotal`, `Order.profit`, `Order.thirdPartyPickupFee`, `CostItem.defaultAmount`, `OrderExtraCost.amount`, `ServiceCostRate.amount` = `Float`. Mixing Int (cents) and Float (decimal VND) produces rounding mismatches in margin calc. **Fix: all VND as `Int`.**
- **Enums**: 9 total. Domain constants — keep. None warrant lookup tables.
- **PickupRequest model** (`prisma/schema.prisma:291-348`): 30+ fields (sender×7, timestamps×7, status×2, vehicle, weights). Borderline godmodel. Acceptable but extract `PickupSenderSnapshot` if rewriting.
- **Cascades**: `ServiceCostRate.onDelete:Cascade`, `OrderExtraCost.onDelete:Cascade`, `Package/TrackingEvent/Payment.onDelete:Cascade`, `PickupPhoto/PickupStatusLog.onDelete:Cascade`. Child-only — safe. `OrderExtraCost.costItem.onDelete:SetNull` — correct.
- **Missing models (BLOCKERS for production)**:
  - `User` / `Account` / `Session` — no auth identity
  - `AuditLog` — no who-did-what trail (Vietnamese e-commerce/logistics compliance often needs this)
  - `Tenant` / `Organization` — no multi-branch scoping
  - `FileAsset` — `PickupPhoto.imageUrl` is a plain string; no storage backend referenced
- **Index quality**: Reasonable. `PickupRequest.driverId` indexed L344. Composite indexes absent — add `(status, createdAt)` for dashboard pages later.

## 2. Shared Components (`components/`)

| File | LOC | Reusable? | Notes |
|---|---:|---|---|
| `admin-shell.tsx` | 82 | No | Hardcoded nav; client comp (`usePathname`). Coupled to 9 routes. |
| `page-header.tsx` | ~32 | Yes | Pure layout, clean API |
| `info-card.tsx` | ~26 | Yes | InfoCard + InfoRow primitives |
| `status-badge.tsx` | 175 | Partial | 3 status domains + 6 badge variants in one file — split |
| `order-table.tsx` | 155 | No | Tight to Order shape (customer.name, shippingService.code) |
| `timeline.tsx` | 57 | Yes | Generic, pure UI |
| `process-flow.tsx` | ~85 | Yes | Renders FlowNode[] with arrows |
| `order-process-flow.tsx` | ~118 | No | Hard-coded 8 nodes from OrderStatus |
| `pickup-process-flow.tsx` | ~63 | No | Hard-coded 6 nodes from PickupStatus |

**Style**: Tailwind utility soup. No design tokens. Colors hardcoded (emerald-50, blue-50, etc.) across files — re-branding will require codebase-wide find/replace.
**A11y**: Minimal — no aria-* on interactive controls; relies on native semantics. Forms HTML5 validation only.
**Process-flow duplication**: `order-process-flow.tsx` and `pickup-process-flow.tsx` share adapter shape (map status → FlowNode). Extract `ProcessFlowAdapter<TStatus>`.

## 3. `lib/`

- **`prisma.ts`** (12 lines): Correct singleton with `globalThis` guard. Keep.
- **`format.ts`** (~33 lines): `formatCurrencyVND`, `formatDate`, `formatDateTime`, `formatWeight`. Hard-coded `"vi-VN"` locale. No i18n infra (no `next-intl`, no locale routing). OK for MVP, blocks expansion.
- **`costing.ts`** (~68 lines): `calculateVolumetricWeight`, `calculateChargeableWeight`, `findServiceCostRate` (DB), `calculateBaseCost`, `calculateOrderProfit`. **Mixed concerns**: pure math + DB call. Split into `costing/pure.ts` + `costing/queries.ts`.
- **`mock-data.ts`** (309 lines): **DEAD CODE**. No imports anywhere. Delete.

## 4. Routing / Data Fetching

- **Server components**: Pages default to async RSC ✓
- **Direct Prisma in RSC**: dashboard, tracking, all admin lists. Acceptable for monolithic admin scale.
- **Cache hints**: `export const dynamic = "force-dynamic"` in dashboard, tracking, several admin pages. Disables ISR — fine for admin.
- **`revalidatePath` pattern**: Called in every `actions.ts` after mutations. Consistent ✓
- **Server-action placement**: Inline `actions.ts` next to routes. Good convention.

## 5. Tooling / Quality Gates

| Gate | Status |
|---|---|
| TypeScript `strict` | ✓ (`tsconfig.json:7`) |
| ESLint | ✓ (next/core-web-vitals + next/typescript) |
| Tests | ✗ ZERO — no jest/vitest |
| Pre-commit hooks | ✗ no husky/lint-staged |
| Env validation | ✗ raw `process.env`, no zod/t3-env |
| `next.config.ts` | ~empty |
| Tailwind theme | Minimal extend |
| Migrations | Present in `prisma/migrations/` (incl. `20260517063710_add_order_pickup_method/`) |

## 6. Footgun Matrix

| Issue | Severity | Location |
|---|---|---|
| Float vs Int currency mix | CRITICAL | `prisma/schema.prisma:119-125,131,176,193,208,210` |
| No user/auth model | HIGH | `prisma/schema.prisma` (entire) |
| No file storage abstraction | HIGH | `prisma/schema.prisma:350-355` |
| Dead `mock-data.ts` | MEDIUM | `lib/mock-data.ts` |
| No tests | MEDIUM | repo root |
| No pre-commit hooks | MEDIUM | repo root |
| No env validation | MEDIUM | `.env` consumers |
| Hardcoded vi-VN locale | MEDIUM | `lib/format.ts`, `app/tracking/page.tsx` |
| Process-flow adapter dup | LOW | `components/*-process-flow.tsx` |
| Tailwind soup, no tokens | LOW | `components/*` |
| No WCAG audit | LOW | global |

## 7. Foundation Verdict

**KEEP**:
- Schema topology (models/relations/indexes)
- Prisma singleton pattern
- RSC + server-action + `revalidatePath` pattern
- Pure costing math
- `lib/format.ts`, `lib/prisma.ts`
- Tailwind + Next 15 baseline

**FIX (refactor-scoped)**:
- All `Float` money → `Int` (or Prisma `Decimal`) — schema migration
- Add `User`/`Session`/`AuditLog`/`Tenant`/`FileAsset` models
- Delete `mock-data.ts`
- Add zod env validation
- Add husky + lint-staged
- Add minimal vitest setup (cover `costing.ts` first)
- Split `costing.ts` pure vs queries
- Split `status-badge.tsx` per domain
- Extract `ProcessFlowAdapter`

**REWRITE only if**: multi-tenant + per-tenant branding becomes near-term requirement (would otherwise be expensive retrofit) OR auth/audit legal requirement collides with refactor timeline.

## Unresolved questions
- Where will pickup photos be stored (S3? local? Cloudinary?) — affects `FileAsset` design
- Will EZWAY ever serve non-Vietnamese locales? Affects i18n scope
- Is "admin" intended for single-team internal use, or future per-customer branch dashboards (multi-tenant)?
