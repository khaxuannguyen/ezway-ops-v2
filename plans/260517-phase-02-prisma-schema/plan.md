# Phase 02 · Prisma Schema + Seed + Domain Helpers

**Date**: 2026-05-17
**Branch**: `master` (no PR yet, working directly)
**Goal**: Production-clean Prisma schema for EZWay Ops core domain + seed data + pure-TS domain helpers. NO UI CRUD, NO auth wiring, NO photo upload.

## Context

EZWay Ops = international shipping ops dashboard (VN → US/EU/Canada, AIR/SEA). Phase 01 finished placeholder admin shell + UI primitives. Phase 02 builds the data layer so Phase 03 can wire forms/tables.

Stack: Next.js 16.2.6 + Prisma 7.8 + Postgres + Accelerate. See [scout](./scout/scout-01-current-state.md) for exact tooling.

## Phase Index

| # | Phase | Status | Link |
|---|-------|--------|------|
| 01 | Prisma schema design (models + enums + relations + indexes) | Not Started | [phase-01](./phase-01-prisma-schema.md) |
| 02 | Seed script + sample data (services, rates, customers, drivers, orders, pickups) | Not Started | [phase-02](./phase-02-seed-data.md) |
| 03 | Domain helpers (`lib/domain/{weight,pricing,profit}.ts`) | Not Started | [phase-03](./phase-03-domain-helpers.md) |
| 04 | Migrate, seed, lint, build, verify | Not Started | [phase-04](./phase-04-migrate-and-verify.md) |

## Top-Level Success Criteria

- [ ] `prisma generate` succeeds, client lands in `app/generated/prisma/`
- [ ] `prisma migrate dev --name init_domain` creates clean migration
- [ ] `prisma db seed` populates DB with all sample data (5 customers, 5 services, 46-row rate table for EZW-AIR-EU, ~15 cost items, 3 drivers, 3-5 orders, ≥1 PickupRequest)
- [ ] `npm run lint` passes (zero errors)
- [ ] `npm run build` passes (Turbopack production build)
- [ ] All `app/admin/**/page.tsx` placeholders untouched
- [ ] Domain helpers are pure TS (no Prisma imports) — testable in isolation

## Key Design Decisions (committed)

1. **IDs**: `cuid()` strings everywhere.
2. **Money**: `Int` VND on all per-order columns. No BigInt in Phase 02.
3. **Soft delete**: `deletedAt DateTime?` on `Customer`, `Order`, `ShippingService`, `CostItem`, `Driver`. Append-only tables hard-delete only.
4. **Generator**: add `importFileExtension = "ts"` (Turbopack ESM fix per [researcher-01 §1](./research/researcher-01-prisma7-patterns.md#1-prisma-7-generator-configuration)).
5. **Accelerate**: add `@prisma/extension-accelerate` + `.$extends(withAccelerate())` in `lib/prisma.ts` (decision deferred to Phase 03 wiring — schema-side no-op).
6. **Weight**: `chargeableWeightKg Decimal @db.Decimal(8,2)` (exact, no float drift on tier boundaries).
7. **ServiceCostRate uniqueness**: `@@unique([serviceId, minWeightKg, maxWeightKg, validFrom])` + `@@index([serviceId, minWeightKg])`.
8. **PickupRequest ↔ Order**: `orderId String @unique` on `PickupRequest` (PickupRequest is optional side).
9. **Order code**: `code String @unique`, generated `EZW-{YYMM}-{seq}` server-side.
10. **AuditLog**: generic table, `entityType String + entityId String`, no FKs to domain entities.
11. **PickupStatusLog**: separate model, append-only, `fromStatus`+`toStatus`+`byUserId`+`note`+`at`.
12. **Seed**: `prisma/seed.ts` via `prisma.config.ts` → `migrations.seed: "tsx prisma/seed.ts"`. Add `tsx` devDep.
13. **Helpers**: pure functions in `lib/domain/{weight,pricing,profit}.ts`, no Prisma imports — pass rates as args.

## Dependencies

- Phase 02 must run **after** Phase 01 (placeholder admin) — already done.
- Phase 03 (UI wiring) blocked until Phase 02 done.
- Requires Prisma Postgres local server (`prisma dev`) running for `migrate dev`.

## Risks

| Risk | Mitigation |
|------|------------|
| Turbopack ESM resolution breaks generated client | `importFileExtension = "ts"` (researcher-01 §1) |
| Lint fails on generated client | `app/generated/**` already in `globalIgnores` (eslint.config.mjs) |
| Seed fails partially → inconsistent DB | Wrap seed in `prisma.$transaction` |
| Rate lookup `Decimal` vs `Float` mismatch in helpers | Helpers accept `number` only; seed/Prisma round before passing |
| Schema drift after `migrate dev` | Commit migration SQL alongside schema |

## Research References

- [Prisma 7 patterns](./research/researcher-01-prisma7-patterns.md)
- [Logistics domain](./research/researcher-02-logistics-domain.md)
- [Current state scout](./scout/scout-01-current-state.md)
