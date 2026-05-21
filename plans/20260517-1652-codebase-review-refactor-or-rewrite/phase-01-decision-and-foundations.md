# Phase 01 — Decision & Foundations

## 1. Context
- Parent: [plan.md](./plan.md)
- Dependencies: none (entry phase)
- Inputs: [research/researcher-01-frameworks-and-stack.md](./research/researcher-01-frameworks-and-stack.md), [scout/scout-01-admin-modules.md](./scout/scout-01-admin-modules.md), [scout/scout-02-shared-infra.md](./scout/scout-02-shared-infra.md)

## 2. Overview
- Date: 2026-05-17
- Description: Lock the hybrid decision, choose stack, scaffold the new repo. No domain code yet.
- Priority: H
- Implementation status: not started
- Review status: pending

## 3. Key Insights
- Codebase is ~2 weeks old, solo, no real users — Joel-Spolsky "never rewrite" does not apply (no tacit knowledge baked in).
- Scout-01 found app shell rot pervasive across 8 modules (~18% duplication of ~4500 LOC) → cheaper to redo shell than retrofit 8 actions files.
- Scout-02 found schema topology sound → port, don't redesign.
- Hybrid = greenfield app + ported `schema.prisma` (with fixes) + ported `lib/costing.ts`, `lib/format.ts`, enums.
- Strangler-fig is overkill for single-dev, zero-user app per research-01 §3; plan stays strangler-style only to keep old repo runnable as reference during port.

## 4. Requirements

**Functional**
- New repo bootstrapped, deployable to Vercel on day 1.
- All chosen libs installed and a single dummy `/health` route returns 200.
- Old repo kept untouched as read-only reference.

**Non-functional**
- TypeScript strict.
- ESLint + Prettier + EditorConfig.
- Husky pre-commit (lint + typecheck + vitest changed files).
- Vitest baseline (one passing test on `lib/costing/pure.ts` once ported in phase 03).
- Env validation via `@t3-oss/env-nextjs` + Zod.
- Node ≥ 20 LTS pinned in `.nvmrc`.

## 5. Architecture

### Stack picks (locked)
| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | Same as old; current LTS RSC story |
| DB (dev) | **SQLite** | Fast local dev; matches old project |
| DB (prod) | **Supabase Postgres (free tier)** | Concurrent writes + reporting + future scale. Schema authored Postgres-compatible from day 1 (no SQLite-only quirks). |
| ORM | Prisma 5 | Same as old; minimize port friction |
| Auth | **Better Auth** | Free, TS-native, Prisma adapter, RBAC plugin |
| Validation | **Zod** | Shared client/server schemas |
| Forms | **react-hook-form + zodResolver** + Next 15 `useActionState` | Replace querySelector DOM patches |
| UI | **shadcn/ui** (Radix + Tailwind) | Copy-in primitives; AI-codable |
| Table | **TanStack Table v8** | Server pagination + sort + column visibility |
| Icons | lucide-react | shadcn default |
| Money | All `Int` (VND đồng, no decimals) | Fix Float bug |
| Locale | `vi-VN` hardcoded for MVP; `next-intl` deferred | YAGNI |
| Multi-tenant | **Skip entirely for MVP** | Q3 = single-tenant. Revisit only when SaaS direction confirmed. |
| Storage | **Cloudflare R2** + FileAsset abstraction | Cheap egress; S3-compatible API |
| Driver portal | Same Next app, route group `(driver)`, mobile-first responsive + PWA manifest | Q2 — no native app needed |
| Tests | Vitest + Playwright (smoke only) | Cover `costing/pure.ts` + 1 happy-path E2E per module |
| Monorepo | **Single app** (no Turborepo) | YAGNI — one app, one dev |

### Folder layout (feature-first)
```
ezway-v2/
  src/
    app/
      (admin)/
        orders/        # routing only — thin
        customers/
        ...
      (driver)/        # mobile-first PWA portal for drivers
        pickups/       # driver's assigned pickups list
        pickups/[id]/  # status update + photo upload
      (auth)/
        sign-in/
      api/
        v1/            # REST for webhooks/integrations + driver PWA later
    features/
      orders/
        actions.ts
        queries.ts
        schemas.ts     # Zod
        components/
        constants.ts
      customers/
      packages/
      services/
      cost-rates/
      cost-items/
      pickups/
      drivers/
    components/
      ui/              # shadcn primitives
      shell/           # admin-shell, page-header
      data/            # DataTable, StatusBadge, ProcessFlow
    lib/
      prisma.ts
      auth.ts          # Better Auth instance
      env.ts           # Zod env
      codegen.ts       # the ONE code-gen util
      costing/
        pure.ts
        queries.ts
      format.ts
    server/
      actions.ts       # typed action wrapper
      audit.ts         # AuditLog helper
  prisma/
    schema.prisma
    migrations/
    seed.ts
  tests/
    unit/
    e2e/
```

## 6. Related Code Files (read/migrate from old repo)
- `prisma/schema.prisma` — port (phase 02)
- `lib/prisma.ts:1-12` — port verbatim
- `lib/format.ts:1-33` — port verbatim
- `lib/costing.ts:1-68` — split pure vs queries (phase 03)
- `lib/mock-data.ts` — **DELETE, do not port**
- `tsconfig.json:7` — copy strict settings
- Old `app/admin/**` — reference only, do not port wholesale

## 7. Implementation Steps
1. Create new repo `ezway-v2` (sibling dir).
2. `pnpm create next-app@latest` → TS, App Router, Tailwind, src/, no examples.
3. Install: `prisma`, `@prisma/client`, `zod`, `@t3-oss/env-nextjs`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-table`, `better-auth`, `lucide-react`, `clsx`, `tailwind-merge`.
4. Dev deps: `vitest`, `@vitejs/plugin-react`, `playwright`, `husky`, `lint-staged`, `prettier`, `prettier-plugin-tailwindcss`.
5. `npx shadcn@latest init` → set design tokens (neutral base).
6. Provision Supabase Postgres free tier (prod) + local Postgres via Docker `docker run -d postgres:16` (dev). Prisma schema authored with `provider = "postgresql"` from day 1 — Postgres-only avoids dual-schema pain (Q7: SQLite was old project's choice; new project standardizes on Postgres for dev/prod parity). Provision Cloudflare R2 bucket; record credentials.
7. Add `lib/env.ts` Zod validation (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`).
8. Add `husky install` + `.husky/pre-commit` running `lint-staged`.
9. Add `.editorconfig`, `.prettierrc`, `.nvmrc`.
10. Stub `/health/route.ts` returning `{ ok: true }`.
11. Confirm `pnpm dev` + `pnpm test` + `pnpm typecheck` pass.
12. First commit + push remote.
13. Document decisions in `ezway-v2/README.md` (stack, why).

## 8. Todo
- [ ] Repo scaffolded
- [ ] Stack deps installed
- [ ] shadcn init + tokens
- [ ] Neon DB provisioned, env validated
- [ ] Husky + lint-staged
- [ ] Vitest baseline (passing empty)
- [ ] `/health` route returns 200
- [ ] First commit pushed
- [ ] README documents stack picks

## 9. Success Criteria
- `pnpm dev` boots clean.
- `pnpm build` succeeds.
- `pnpm test` runs (0 tests OK).
- `pnpm lint` + `pnpm typecheck` clean.
- Pre-commit hook blocks bad code.

## 10. Risk Assessment
| Risk | Mitigation |
|---|---|
| Local Postgres adds dev friction vs SQLite | Docker compose one-liner; if friction wins, fall back to SQLite-compatible schema subset (no JSONB, no arrays — all in plan) |
| Better Auth less mature than Auth.js | Has Prisma adapter + RBAC; fallback to Auth.js v5 is straightforward |
| shadcn copy-in components increase repo size | Acceptable; gives full control + no version-lock |
| Single-dev burnout porting 8 modules | Phase order favors highest-value first (orders); ship incrementally |
| Decision reversal mid-phase | Phase 02 schema port is the point-of-no-return; lock by end of phase 01 |

## 11. Security Considerations
- `BETTER_AUTH_SECRET` rotated, never committed.
- `.env.local` in `.gitignore` (Next default).
- Neon connection uses TLS + pooled connection string.
- No secrets in client bundles — enforced by `lib/env.ts` server/client split.
- Plan auth middleware in phase 03 — until then, do not deploy publicly.

## 12. Next Steps
Proceed to [phase-02-domain-and-schema-port.md](./phase-02-domain-and-schema-port.md).
