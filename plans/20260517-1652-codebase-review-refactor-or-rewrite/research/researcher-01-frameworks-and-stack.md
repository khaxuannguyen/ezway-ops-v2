# Research 01 — Decision Frameworks & Modern Stack

Note: WebFetch/WebSearch denied in env. Written from training knowledge through Jan 2026. No live citations.

## 1. Refactor-vs-Rewrite Decision Criteria

### Joel Spolsky — "Things You Should Never Do" (2000, still cited)
- Rewrites lose tacit knowledge: bugs that codebase already handled get reintroduced.
- Argument applies most when codebase is **mature** (years of bugfixes baked in).
- **Inverse applies**: a ~2-week codebase has almost no baked-in knowledge to lose. Spolsky's rule weakens dramatically here.

### Martin Fowler — Strangler Fig
- New system grows around old one, gradually replacing routes.
- Best when old system has real users + real data + can't go down.
- Overkill for a single-dev project with no production users.

### Michael Feathers — "Working Effectively with Legacy Code"
- "Legacy code = code without tests." By that definition, this entire project is legacy on day one.
- Feathers' techniques (seams, characterization tests) optimize for *can't-rewrite-but-must-change*. They are weapons of necessity, not preference.

### Modern (2024-2026) decision heuristics
Practical checklist used in industry:
| Criterion | Refactor signal | Rewrite signal |
|---|---|---|
| Codebase age | Years | Weeks |
| Test coverage | High | None |
| Production users | Many | Zero / internal only |
| Schema stability | Stable | Still churning |
| Team size | Multi | Solo |
| Architectural rot | Localized | Pervasive (every module repeats same mistake) |
| Sunk cost vs forward cost | Refactor < Rewrite | Rewrite < Refactor |
| Stakeholder appetite | Risk-averse | Greenfield OK |

**Hybrid option** (most common in practice): keep schema/domain knowledge, rewrite app shell. This is what "rewrite" usually means in 2025 — not literal blank slate, but new project + ported models + ported business rules.

## 2. Reference Architecture — Next.js 15 + Prisma Admin App (2026)

### Folder layout
Two dominant patterns:
- **Layer-first**: `app/`, `lib/`, `components/` — fine for ≤10 routes, breaks down past that. EZWAY uses this.
- **Feature-first (recommended for SaaS admin)**:
  ```
  src/
    features/
      orders/
        actions.ts
        schemas.ts
        queries.ts
        components/
        pages/  (or routed via app/(admin)/orders/)
    lib/        (truly cross-cutting only)
    components/ui/  (design system primitives)
    app/        (routing layer, thin)
  ```
  Feature folder keeps Prisma queries, Zod schemas, server actions, components co-located.

### Server Actions vs tRPC vs REST
- **Server Actions** (Next 15 default): great for forms + RSC mutations, no client overhead. Weakness: typed-fetch outside React (mobile, background jobs).
- **tRPC**: still strongest typed RPC if you have non-Next clients or React Native app.
- **REST + OpenAPI**: needed if external partners (carriers, 3PLs) integrate. Logistics often does.
- 2026 consensus for admin-only app: Server Actions + a thin `/api/v1/*` REST layer for webhooks/integrations.

### Validation
- **Zod** (or Valibot for bundle-size sensitive) is non-negotiable. Both client + server share schemas.
- **conform-to** or **react-hook-form + zodResolver** for forms. `useActionState` (Next 15) replaces older `useFormState`.

### Auth
- **Auth.js v5** (NextAuth successor) — flexible but heavy DIY.
- **Better Auth** — TS-native, growing fast, plugin model, good for admin SaaS.
- **Clerk** — fastest to ship, paid past a free tier; org/role support out of the box.
- For Vietnamese SMB admin: Better Auth + Prisma adapter is the modern free choice.

### Database
- **SQLite (Turso)**: fine for single-tenant admin ≤ ~50k rows/table, edge replicas; weak on concurrent writes + analytics.
- **Postgres (Neon/Supabase)**: default for any SaaS aspiring to grow; row-level security for multi-tenancy.
- For a shipping admin that may add reporting, multi-branch, third-party integrations: **Postgres**. SQLite is a prototype choice.

### Money handling
- Never `Float`. Either `Int` (smallest currency unit, VND = no decimals so this is natural) or `Decimal` (Prisma `Decimal` type). Current schema mixes `Int` and `Float` — bug bait.

### UI
- **shadcn/ui** (Radix + Tailwind, copy-in components) is the 2024-2026 default for new Next.js admin.
- Alternatives: **Park UI**, **HeroUI**, **Mantine**. shadcn wins for customization + AI-codeable patterns.
- **TanStack Table** for any non-trivial table (sort/filter/paginate/columns).

### Multi-tenancy
- Logistics admin usually grows multi-branch. Add `tenantId` to every business table from day 1 + middleware that scopes queries. Cheap to add now, painful later.
- Optional: organization model (Better Auth supports natively).

## 3. Strangler-Fig Tactics for Next.js

- **Route-level cohabitation**: new app under `/v2/*`, gateway routes new traffic. Easy in Next via rewrites or two deployments behind a reverse proxy.
- **Schema dual-write**: keep one DB, both apps read/write. Works if DB stays.
- **Shared Prisma client across two repos**: extract `@ezway/db` package or git submodule. Or just keep one repo with two app dirs.
- For projects with <100 routes and solo dev: strangler fig is *over-engineering*. A clean cutover at a single-digit weekly user count is cheaper.

## Unresolved questions
- EZWAY production status — are there real customers/orders or only seed data?
- Mobile/driver app planned? (Affects API vs Server Action choice + auth approach.)
- Multi-branch / multi-country requirement timing?
- Budget for paid services (Clerk, Vercel, Neon paid plan)?
- Vietnamese-specific compliance (VAT invoices, e-invoice export to GDT)?
