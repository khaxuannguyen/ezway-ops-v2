# Phase 03 — Shared Foundations

## 1. Context
- Parent: [plan.md](./plan.md)
- Depends on: phase-01, phase-02
- Source: [scout/scout-01-admin-modules.md "Cross-Cutting Findings" + "Duplication Map"](./scout/scout-01-admin-modules.md), [scout/scout-02-shared-infra.md §3,§5](./scout/scout-02-shared-infra.md)

## 2. Overview
- Date: 2026-05-17
- Description: Build the cross-cutting primitives every module port (phases 04-06) depends on: typed action wrapper, code-gen util, Field component, auth middleware, audit helper, env validation, design tokens, shared StatusBadge/ProcessFlow.
- Priority: H
- Implementation status: not started
- Review status: pending

## 3. Key Insights
- 8 copies of `getText/getNumber/requireValue` (scout-01 dup map) → one Zod-backed action wrapper kills all.
- 5 variants of code-gen `XXX-YYMMDD-NNNN` (CRITICAL severity) → one `codegen(prefix, date, seq)` util.
- 2 copies of weight calc (`orders/actions.ts:202`, `packages/actions.ts:70`) → `lib/costing/pure.ts` already covers; just import.
- `status-badge.tsx` (175 LOC) mixes 3 status domains + 6 variants — split per domain.
- `order-process-flow.tsx` + `pickup-process-flow.tsx` share adapter shape → `ProcessFlowAdapter<TStatus>`.
- No auth, no error.tsx, no loading.tsx, no env validation.

## 4. Requirements

**Functional**
- Typed server-action wrapper: `defineAction({ schema, handler })` returns RHF/`useActionState`-compatible result `{ ok, data, fieldErrors, formError }`.
- `codegen({ prefix, date, seq })` returns padded code; pulls seq from Prisma transactional counter table OR `count + 1` within `$transaction`.
- `<Field>` form primitive (label + input + error) used in every form.
- Better Auth wired with email/password + optional Google OAuth provider.
- `middleware.ts` redirects unauthenticated to `/sign-in`; admin role required for `/admin/**`.
- `audit(action, entityType, entityId, before, after)` helper logs to AuditLog inside the same transaction as mutation.
- `lib/env.ts` validated at boot.

**Non-functional**
- Vitest covers `codegen`, `costing/pure`, action wrapper.
- Zero `useState` in form components — RHF only.
- All server actions return same `ActionResult<T>` shape.

## 5. Architecture

### Action wrapper contract
```ts
// src/server/actions.ts
defineAction<TIn, TOut>({
  schema: ZodSchema<TIn>,
  authorize?: (ctx) => boolean,    // RBAC
  audit?: { entityType: string },
  handler: (input: TIn, ctx) => Promise<TOut>,
}) => (formData: FormData) => Promise<ActionResult<TOut>>

ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> }
```

### Field primitive
```
<Field label="Tên" name="name" error={errors.name}>
  <Input {...register("name")} />
</Field>
```

### Folder additions
```
src/
  server/
    actions.ts       # defineAction
    audit.ts         # audit() helper
    auth.ts          # getSession() + requireRole()
  lib/
    codegen.ts       # ONE code-gen
    env.ts           # Zod
    costing/
      pure.ts        # ported
      queries.ts     # findServiceCostRate (DB)
    format.ts
  components/
    ui/              # shadcn (Button, Input, Label, Select, Dialog, DropdownMenu, Sheet, Card, Tabs, Badge, Toast)
    form/
      field.tsx
      currency-input.tsx
      date-input.tsx
    data/
      data-table.tsx        # TanStack wrapper
      status-badge.tsx      # generic
      order-status-badge.tsx
      pickup-status-badge.tsx
      payment-status-badge.tsx
      process-flow.tsx
      process-flow-adapter.ts
    shell/
      admin-shell.tsx
      page-header.tsx
      empty-state.tsx
      app/error.tsx
      app/loading.tsx
middleware.ts
```

## 6. Related Code Files (read/migrate from old repo)
- `app/admin/orders/actions.ts:1-512` — extract `getText/getNumber/requireValue` pattern → replaced by Zod
- `app/admin/orders/actions.ts:104` + `app/admin/packages/actions.ts:57` + `app/admin/pickups/actions.ts:41` + `app/admin/drivers/actions.ts:23` + customer codegen — all consolidate to `lib/codegen.ts`
- `lib/costing.ts:1-68` — split: pure math → `lib/costing/pure.ts`, `findServiceCostRate` → `lib/costing/queries.ts`
- `lib/format.ts:1-33` — port verbatim
- `lib/prisma.ts:1-12` — port verbatim
- `components/status-badge.tsx:1-175` — split 3 domains
- `components/process-flow.tsx`, `order-process-flow.tsx`, `pickup-process-flow.tsx` — extract adapter
- `components/admin-shell.tsx:1-82` — redo with shadcn Sheet for mobile

## 7. Implementation Steps
1. Port `lib/prisma.ts` verbatim.
2. Port `lib/format.ts` verbatim. Add unit test (VND formatting).
3. Split `lib/costing.ts` → `pure.ts` (volumetric, chargeable, baseCost, profit) + `queries.ts` (findServiceCostRate). Unit-test `pure.ts` with table-driven cases.
4. Write `lib/codegen.ts` with signature `codegen({ prefix, date?, sequence })` returning `XXX-YYMMDD-NNNN`. Test with frozen date.
5. Write `lib/env.ts` using `@t3-oss/env-nextjs` + Zod. Validate `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CLOUDINARY_URL?`.
6. Configure Better Auth (`src/server/auth.ts`) with Prisma adapter, email/password, role plugin (`ADMIN`, `STAFF`).
7. Create `middleware.ts` — guards `/admin/**` with `requireRole("ADMIN" | "STAFF")`.
8. Build `src/server/actions.ts` `defineAction` wrapper — parses FormData via `zod-form-data` or custom adapter; runs authorize → handler; wraps in `$transaction` if `audit` set; returns `ActionResult`.
9. Build `src/server/audit.ts` — accepts Prisma tx client + writes AuditLog row.
10. shadcn install primitives: button input label select textarea dialog sheet dropdown-menu card tabs badge toast table separator.
11. Build `components/form/field.tsx` and `currency-input.tsx` (Int đồng) and `date-input.tsx`.
12. Build `components/data/data-table.tsx` — generic TanStack wrapper with server pagination (page, pageSize, sort, filter URL params).
13. Build `components/data/status-badge.tsx` generic + 3 thin wrappers (order/pickup/payment).
14. Build `components/data/process-flow.tsx` + `process-flow-adapter.ts`.
15. Build `components/shell/admin-shell.tsx` — nav defined as data, not hardcoded; shadcn Sheet for mobile drawer.
16. Add `app/error.tsx` (global) + `app/loading.tsx` + per-segment `loading.tsx` for `/admin/*` lists.
17. Vitest: write tests for `codegen`, `costing/pure`, `defineAction` happy + zod error path.
18. Confirm `pnpm test` green.

## 8. Todo
- [ ] lib/prisma.ts ported
- [ ] lib/format.ts ported + tested
- [ ] lib/costing split + tested
- [ ] lib/codegen.ts + test
- [ ] lib/env.ts validates at boot
- [ ] Better Auth wired
- [ ] middleware guards /admin
- [ ] defineAction + tests
- [ ] audit() helper
- [ ] shadcn primitives installed
- [ ] Field + CurrencyInput + DateInput
- [ ] DataTable wrapper
- [ ] StatusBadge split per domain
- [ ] ProcessFlow + adapter
- [ ] AdminShell data-driven
- [ ] error.tsx + loading.tsx

## 9. Success Criteria
- All 8 dup helpers from scout-01 replaced by 1 `defineAction`.
- All 5 codegen variants replaced by 1 `codegen()`.
- `grep -r "getText\|getNumber\|requireValue" src/` returns 0 hits.
- `pnpm test` ≥ 10 passing tests across utils.
- `/admin` unauthenticated → 302 to `/sign-in`.
- Boot fails fast if any required env var missing.

## 10. Risk Assessment
| Risk | Mitigation |
|---|---|
| `defineAction` over-engineered, hard to use | Keep API surface small; iterate on first usage in phase 04 orders before locking |
| Better Auth + Next 15 RSC subtle session issues | Use Better Auth's `getSession` server-only helper; cache per request |
| TanStack Table v8 learning curve | Pin to one DataTable wrapper; all modules consume same API |
| Audit log explodes row count | Cap retention via TTL job or partition; deferred until volume justifies |
| shadcn theme drift between modules | Lock tokens in `globals.css` + tailwind.config; review in phase 07 |

## 11. Security Considerations
- Session cookie: httpOnly, secure, sameSite=lax.
- CSRF: Better Auth handles for its routes; server actions are protected by Next 15's built-in same-origin check + action ID.
- `defineAction.authorize` checked BEFORE Zod parse to prevent oracle attacks (don't reveal field validity to unauth).
- AuditLog write inside same `$transaction` as mutation — no orphaned mutations without trail.
- Env validation prevents accidental production boot without `BETTER_AUTH_SECRET`.
- `CurrencyInput` stores `Int`; client never sends `Float`.

## 12. Next Steps
Proceed to [phase-04-module-port-orders-customers-packages.md](./phase-04-module-port-orders-customers-packages.md).
