---
date: 2026-05-17
scope: Prisma 7.8 + Next.js 16 schema modeling best practices for logistics ops system
---

# Prisma 7.8 + Next.js 16 Reference: Schema Design Patterns

## 1. Prisma 7 Generator Configuration

**Provider change**: `prisma-client` (v7) replaces deprecated `prisma-client-js`. Both work identically.

**Output folder**: Points to directory where generated files live. Import from `../app/generated/prisma/client`.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
  importFileExtension = "ts"  // Prevent ESM .js import errors in Next.js 16
}
```

**ESM gotcha**: Turbopack resolves imports strictly. Use `importFileExtension = "ts"` to match TypeScript sources, preventing "Cannot find module './class.js'" errors at runtime. [Prisma Docs](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client)

---

## 2. Prisma Postgres + Accelerate (v7)

**accelerateUrl in PrismaClient**: 
```typescript
import { PrismaClient } from "../app/generated/prisma/client"
import { withAccelerate } from "@prisma/extension-accelerate"

export const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,  // prisma+postgres:// or prisma://
}).$extends(withAccelerate())
```

**prisma.config.ts**: Move DB URL here (removed from schema).
```typescript
import "dotenv/config"
import { defineConfig, env } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: env("DATABASE_URL") },
})
```

No `--no-engine` flag needed in v7. Standard `prisma generate` works everywhere. [Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)

---

## 3. Migrations Workflow (v7)

**Command**: `npx prisma migrate dev --name init_domain` works locally against `prisma+postgres://localhost:51213/...`

**prisma.config.ts integration**:
```typescript
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: { url: env("DATABASE_URL") },
})
```

CLI reads schema + datasource from config automatically. No flags needed for local dev. [Config Reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference)

---

## 4. Seeding in v7

**package.json approach (deprecated)**: Removed in v7.

**Config-driven (v7+)**:
```typescript
// prisma.config.ts
migrations: {
  path: "prisma/migrations",
  seed: "tsx prisma/seed.ts",  // Any command—runs only on `npx prisma db seed`
}
```

**Seed script** (`prisma/seed.ts`):
```typescript
import { prisma } from "../lib/prisma"

async function main() {
  // Populate test data
  await prisma.pickupRequest.create({ /* ... */ })
}

main().catch(e => { throw e }).finally(() => prisma.$disconnect())
```

Run: `npx prisma db seed` (NOT automatic post-migrate). [Seeding Docs](https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding)

---

## 5. Money Handling (VND Logistics)

**Recommendation for VND (no fractional unit)**:
- **Int** (minor units): Store `amount: Int` as VND centimes, fastest for ops (no library overhead).
- **Decimal(18,0)**: Store exact whole-VND with `@db.Numeric(18, 0)`, safest for audits.
- Avoid `Float` (rounding errors in math).
- Avoid PostgreSQL `money` type (locale-dependent, deprecated by Prisma).

```prisma
model Order {
  totalAmountVnd    Int  // Minor units, e.g., 500000 = 500k VND
  feeAmountVnd      Decimal @db.Numeric(18, 0)  // For forex/splits needing precision
}
```

Logic: Return `totalAmountVnd / 1000` to frontend for display. [Money in PostgreSQL](https://wanago.io/2024/03/04/api-nestjs-money-postgresql-prisma/)

---

## 6. ID Defaults & Indexing

**cuid(2) vs uuid()**: cuid(2) shorter, sequential-friendly for ORMs; uuid() globally unique across clusters.

```prisma
model PickupRequest {
  id String @id @default(cuid())
  
  // Hot query paths: Order → Package lookup
  @@index([orderId, createdAt])
  @@unique([externalId, supplierId])
}
```

Composite indexes on `(orderId, createdAt)` for range queries. Unique constraint on external ID + supplier for dedup. [Fields & Types](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types)

---

## 7. Relationships & Cascade Rules

**Parent-child cascade**: Order ↔ Package, PickupRequest ↔ PickupPhoto.

```prisma
model Order {
  packages Package[]
}

model Package {
  orderId  String
  order    Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
}
```

Use `Cascade` for owner-owned (Order → Package: delete order = delete packages). Use `Restrict` for shared resources (avoid orphans). No `onUpdate: Cascade` needed; Prisma handles FK updates. [Relations](https://www.prisma.io/docs/orm/prisma-schema/relations)

---

## 8. JSON & Enums

**JSON for flexible blobs**:
```prisma
model AuditLog {
  payload Json  // { action: "create", changes: {...} }
}
```

**PostgreSQL Enums** (native, preferred):
```prisma
enum OrderStatus {
  Pending
  Assigned
  InTransit
  Delivered
}

model Order {
  status OrderStatus
}
```

Generates PostgreSQL `CREATE TYPE`, enforces at DB level. Omit `@db.Enum("Pending", ...)` for auto-mapping. [Schema API](https://www.prisma.io/docs/orm/reference/prisma-schema-reference)

---

## 9. Audit Pattern

```prisma
model Order {
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdById String
  createdBy   User @relation("OrderCreatedBy", fields: [createdById], references: [id])
  
  // Soft delete
  deletedAt DateTime?
  deletedById String?
  deletedBy User? @relation("OrderDeletedBy", fields: [deletedById], references: [id])
}
```

Middleware filters soft-deletes automatically; `deletedAt` provides compliance trail. [Soft Delete Middleware](https://www.prisma.io/docs/orm/prisma-client/client-extensions/middleware/soft-delete-middleware)

---

## 10. Naming Conventions

**Models**: PascalCase (`Order`, `PickupRequest`).
**Fields**: camelCase (`createdAt`, `orderId`).
**DB tables**: snake_case via `@@map("orders")`.
**Enums**: PascalCase (`OrderStatus`, `DeliveryType`).

```prisma
model PickupRequest {
  @@map("pickup_requests")
}
```

---

## 11. Logistics Schema Snapshot Pattern

For **line items (rates snapshot at order time)**:

```prisma
model OrderLineItem {
  orderId      String
  itemId       String
  snapshotRate Decimal @db.Numeric(18,0)  // Rate locked at order create
  quantity     Int
  
  @@id([orderId, itemId])
}
```

Denormalize totals on Order (`totalAmountVnd`, `totalFeeVnd`) for queries; recompute on write. Trade-off: fast reads, slower writes, eventual-consistency risk if fees are async. [Data Migration Guide](https://www.prisma.io/docs/guides/data-migration)

---

## Unresolved Questions

1. **Turbopack + Prisma 7 boundary**: Does `importFileExtension = "ts"` fully eliminate ESM resolution issues, or does Turbopack still require workarounds (e.g., `requireSync` wraps)?
2. **Seed transaction rollback**: If `prisma db seed` fails mid-insert, does Prisma auto-rollback, or must seed.ts manage transactions?
3. **Multi-datasource migrations**: Does `prisma migrate dev` work with multiple datasources in `prisma.config.ts`, or one-datasource-per-run?

