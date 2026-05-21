# Phase 02 — Domain & Schema Port

## 1. Context
- Parent: [plan.md](./plan.md)
- Depends on: [phase-01-decision-and-foundations.md](./phase-01-decision-and-foundations.md)
- Source: [scout/scout-02-shared-infra.md §1](./scout/scout-02-shared-infra.md)

## 2. Overview
- Date: 2026-05-17
- Description: Port `prisma/schema.prisma` to new repo with currency fix, add User/Session/AuditLog/FileAsset, plan data migration from old SQLite.
- Priority: H
- Implementation status: not started
- Review status: pending

## 3. Key Insights
- Schema topology is sound (scout-02 §1). Keep models, relations, indexes.
- Currency mix (Int + Float) is the single most dangerous bug — fix during port (scout-02 footgun matrix CRITICAL).
- No `User`/`Session`/`AuditLog`/`FileAsset` — production blockers.
- `PickupRequest` is borderline godmodel (30+ fields) but acceptable; optional snapshot extraction.
- All enums are domain constants — no lookup tables needed.
- Composite indexes absent — add `(status, createdAt)` for hot list pages.

## 4. Requirements

**Functional**
- New `schema.prisma` compiles + migrates clean on Postgres.
- All currency fields are `Int` (VND đồng).
- `User`, `Session`, `Account`, `Verification` tables (Better Auth shape) present.
- `AuditLog` model captures who/what/when for mutations.
- `FileAsset` model abstracts photo URLs (pickup photos point to FileAsset).
- Data migration script exports old SQLite → imports new Postgres without data loss (only seed/dev data expected).

**Non-functional**
- Migration scripts idempotent.
- Seed script reproduces baseline service+cost-rate rows.
- Type-check passes on `prisma generate`.

## 5. Architecture

### Model-by-model port diff
| Model | Action | Notes |
|---|---|---|
| `Order` | Port + fix | `baseCost`, `extraCostTotal`, `profit`, `thirdPartyPickupFee` → `Int`. Add `createdById`. Add `@@index([status, createdAt])`. (No `tenantId` — Q3 single-tenant.) |
| `OrderExtraCost` | Port + fix | `amount` → `Int`. |
| `Customer` | Port verbatim | Add `createdById`. |
| `Package` | Port verbatim | Already clean. |
| `TrackingEvent` | Port verbatim | |
| `Payment` | Port verbatim | `amount` already `Int`. |
| `ShippingService` | Port verbatim | |
| `ServiceCostRate` | Port + fix | `amount` → `Int`. |
| `CostItem` | Port + fix | `defaultAmount` → `Int`. |
| `Driver` | Port verbatim | Optional: link to `User` (if drivers will log in). |
| `PickupRequest` | Port + minor refactor | Keep as-is. Add `@@index([status, createdAt])`. Photos relation now points via `FileAsset`. |
| `PickupPhoto` | Refactor | Replace `imageUrl: String` with `assetId: String` FK → `FileAsset`. |
| `PickupStatusLog` | Port verbatim | Always written atomically with status change (enforced in phase 06). |
| **NEW** `User` | Add | Better Auth schema — id, email, name, emailVerified, image, role. |
| **NEW** `Session` | Add | Better Auth. |
| **NEW** `Account` | Add | Better Auth (OAuth). |
| **NEW** `Verification` | Add | Better Auth. |
| **NEW** `AuditLog` | Add | `id, userId, action, entityType, entityId, before Json?, after Json?, createdAt`. Indexed `(entityType, entityId)`. |
| **NEW** `FileAsset` | Add | `id, key (R2 object key), url (public CDN url), mimeType, sizeBytes, provider (enum: R2/LOCAL), uploadedById, createdAt`. Default provider = `R2`. |
| **NEW** `Driver` ↔ `User` link | Add | `Driver.userId` optional FK → `User` (Q2: drivers will log in via PWA). |

### Currency rule (locked)
- VND has no decimals. All money fields = `Int` (đồng).
- Float prohibited. Lint rule will flag (phase 03).

### Data migration path
```
old SQLite (prisma db pull) ─► tsx export script ─► JSON dumps per table
                                                     │
                                                     ▼
                                  tsx import script ─► Postgres (new schema)
                                          │
                                          ▼
                              Float → Int conversion (round VND)
```

## 6. Related Code Files (read/migrate from old repo)
- `prisma/schema.prisma` (entire) — primary source
- `prisma/schema.prisma:119-125,131,176,193,208,210` — Float fields to convert (scout-02 footgun)
- `prisma/schema.prisma:291-348` — PickupRequest
- `prisma/schema.prisma:350-355` — PickupPhoto (refactor to FileAsset)
- `prisma/seed.js` — baseline data to reproduce
- `prisma/migrations/` — reference only; new repo starts fresh migration history

## 7. Implementation Steps
1. Copy `schema.prisma` from old → new repo.
2. Switch `datasource db.provider` to `postgresql`.
3. Find/replace all `Float` money fields → `Int`. Sanity-check by `grep -n "Float" schema.prisma` (expect zero).
4. Add Better Auth models (`User`, `Session`, `Account`, `Verification`) per Better Auth docs.
5. Add `AuditLog` and `FileAsset` models.
6. Refactor `PickupPhoto` → relation to `FileAsset`.
7. Add `createdById` FK to `Order`, `Customer`, `PickupRequest`, `Driver`.
8. Add composite indexes: `Order(@@index([status, createdAt]))`, `PickupRequest(@@index([status, createdAt]))`, `Package(@@index([status, createdAt]))`.
9. `prisma migrate dev --name init` — confirm clean migration.
10. Port `prisma/seed.js` → `prisma/seed.ts` with Zod-validated seed data. Reproduce shipping services + default cost rates.
11. Write `scripts/export-old.ts` — connects to old SQLite via separate Prisma client, dumps each table to `migrations-data/*.json`.
12. Write `scripts/import-new.ts` — reads JSON, converts Float→Int with `Math.round`, inserts in dependency order.
13. Dry-run import on local Postgres. Verify row counts match.
14. Document migration runbook in `docs/migration.md`.

## 8. Todo
- [ ] schema.prisma copied
- [ ] provider → postgresql
- [ ] All Float money → Int
- [ ] Better Auth models added
- [ ] AuditLog + FileAsset added
- [ ] PickupPhoto → FileAsset relation
- [ ] createdById added
- [ ] Composite indexes added
- [ ] `prisma migrate dev` clean
- [ ] seed.ts ports baseline
- [ ] export-old.ts written
- [ ] import-new.ts written
- [ ] Dry-run row counts match
- [ ] migration.md runbook

## 9. Success Criteria
- `prisma generate` produces valid client.
- `prisma migrate dev` creates one initial migration cleanly.
- `grep "Float" prisma/schema.prisma` returns empty.
- `prisma db seed` populates services + cost-rate brackets.
- Dry-run import: row counts old vs new match for every table.
- Zero data loss on Float→Int conversion (only rounding of already-VND-integer values).

## 10. Risk Assessment
| Risk | Mitigation |
|---|---|
| Float→Int rounding loses sub-VND values | VND has no sub-unit; assert values are already integers in import script, fail loud if not |
| Better Auth schema drift between minor versions | Pin Better Auth version, commit lockfile |
| Postgres connection-pool exhaustion in dev | Use Neon's pooled connection string |
| Schema change requires re-port mid-phase 04 | Lock schema at end of phase 02; treat any phase 04+ change as a migration |
| Old SQLite has corrupt seed data | Export script validates against Zod schema before write |

## 11. Security Considerations
- `AuditLog.before/after` may contain PII (customer phone, address) → not exposed to client; admin-only queries.
- `FileAsset.url` is a public R2 CDN URL by default — fine for non-sensitive product images, but pickup photos may contain customer ID/personal data → use R2 signed URLs (presigned GET) for those, stored via `FileAsset.visibility: PUBLIC|PRIVATE`.
- Migration scripts never log secrets or full row content to stdout in production.
- `User.role` enum: `ADMIN`, `STAFF`, `DRIVER` (DRIVER kept — Q2 confirmed driver PWA portal).

## 12. Next Steps
Proceed to [phase-03-shared-foundations.md](./phase-03-shared-foundations.md).
