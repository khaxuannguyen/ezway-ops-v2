---
date: 2026-05-17
scope: Snapshot of repo state before Phase 02
---

# Scout 01 · Current ezway-ops-v2 state

## Tooling versions
- `next` 16.2.6, `react` 19.2.4 (NOT the Next.js you know — see AGENTS.md, read `node_modules/next/dist/docs/` before App Router changes)
- `@prisma/client` 7.8.0, `prisma` 7.8.0 (v7 — generator `prisma-client`, NOT `prisma-client-js`)
- `tailwindcss` v4, `@tailwindcss/postcss`
- `zod` 4.4.3, `react-hook-form` 7.76, `@tanstack/react-table` 8.21
- `eslint` 9 + `eslint-config-next` 16.2.6
- `typescript` 5

## Prisma setup (already in place, do not break)
- `prisma/schema.prisma` (only generator + datasource blocks, NO models yet):
  ```prisma
  generator client {
    provider = "prisma-client"
    output   = "../app/generated/prisma"
  }
  datasource db { provider = "postgresql" }
  ```
- `prisma.config.ts` uses `import "dotenv/config"` and `defineConfig` from `prisma/config`. Sets `migrations.path = "prisma/migrations"`.
- `lib/prisma.ts` instantiates `new PrismaClient({ accelerateUrl: url, log: ... })`. Imports `PrismaClient` from `@/app/generated/prisma/client` (relative to generator output).
- `.gitignore` excludes `/app/generated/prisma`.
- `.env` has working `prisma+postgres://localhost:51213/...` (Prisma Postgres local dev server).

## Domain placeholders (all empty `ModulePlaceholder` pages today)
- `/admin/dashboard` (only real page, summary cards with `—` values)
- `/admin/orders`, `/admin/customers`, `/admin/packages`, `/admin/services`,
  `/admin/cost-rates`, `/admin/cost-items`, `/admin/pickups`, `/admin/drivers`
- Pages do NOT import Prisma yet → Phase 02 does not need to touch them.

## UI primitives + shared building blocks (Phase 03 will consume)
- `components/ui/{button,card,badge,input,label,table,skeleton,separator}.tsx`
- `components/shared/{data-table,empty-state,form-section,money-display,page-header,status-badge,module-placeholder}.tsx`
- `components/admin/{admin-shell,header,sidebar}.tsx`

## Lib helpers in place
- `lib/utils.ts` — `cn()` (clsx + tailwind-merge)
- `lib/format.ts` — VN locale formatters (currency, weight, date, datetime)
- `lib/env.ts` — `readEnv` / `readOptionalEnv` + `env` export (NODE_ENV, DATABASE_URL, APP_NAME)
- `lib/prisma.ts` — singleton client w/ globalThis cache for dev HMR
- `lib/nav.ts` — `ADMIN_NAV` sections (matches placeholder routes)

## Conventions to keep
- Path alias `@/*` → repo root (per tsconfig — confirmed by imports)
- Vietnamese UI strings (`"Đơn hàng"`, etc.) — keep for new admin copy
- `metadata.title` per page; root layout has Inter font w/ vietnamese subset
- VN-format helpers go in `lib/format.ts`; pure utility math goes in new `lib/domain/*.ts`

## Phase 02 NEW files to create
- `prisma/schema.prisma` — full domain model (replaces stub)
- `prisma/seed.ts` — seed script (or `prisma/seed/index.ts`)
- `lib/domain/weight.ts` — `calculateVolumetricWeight`, `calculateChargeableWeight`, tier rounding
- `lib/domain/pricing.ts` — `calculateBaseCost(serviceId, chargeableKg, rates[])`
- `lib/domain/profit.ts` — `calculateOrderProfit({ totalFee, baseCost, extraCosts })`
- Optionally: `lib/domain/index.ts` re-exports

## Files NOT to touch in Phase 02
- Any `app/admin/**/page.tsx` (UI wiring is Phase 03)
- `components/**`, `lib/format.ts`, `lib/utils.ts`, `lib/nav.ts`, `lib/env.ts` (already finalized in Phase 01)
- `app/layout.tsx`, `app/globals.css` (theme tokens locked)

## Open implementation questions
- Need to confirm if `npx prisma db seed` in v7 picks up `seed` config from `prisma.config.ts` vs `package.json["prisma"]` — researcher-01 covers this.
- Prisma Postgres local server (`prisma dev`) may need to be running for `migrate dev` — confirm in plan steps.
- `npm run lint` script is just `eslint` (no args) — should pass once `prisma/seed.ts` is added (need to exclude generated client from lint if not already).
