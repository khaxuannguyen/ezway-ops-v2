# Scout 01 — Admin Modules Audit

Refactor risk: **HIGH**. Application layer rot is pervasive; foundation (schema, lib utils) is salvageable.

## Per-Module Tables

### 1. ORDERS
| File | LOC | Pattern | Issues |
|---|---:|---|---|
| `app/admin/orders/page.tsx:8-23` | 16 | RSC + include | No pagination; nested customer.payments include |
| `app/admin/orders/actions.ts:1-512` | 512 | Server actions | 8 helper functions duplicating FormData parsing; no Zod |
| `app/admin/orders/orders-client.tsx:1-93` | 93 | Client | Client-side filter on all rows, no server search |
| `app/admin/orders/new/page.tsx:40-341` | 301 | RSC form | 20KB; querySelector DOM patching at L318-338 |
| `app/admin/orders/[id]/page.tsx:26-668` | 642 | RSC detail | 6 form action; inline calcs in render |

**Anti-patterns**: `generateOrderCode` 30+ LOC; manual status dict; manual FormData parsing; transactions only at L230 for customer+order; fragile inline JS in form.

### 2. CUSTOMERS
| File | LOC | Pattern | Issues |
|---|---:|---|---|
| `app/admin/customers/page.tsx:8-21` | 14 | RSC | N+1: orders { payments } per customer |
| `app/admin/customers/actions.ts:1-130` | 130 | Server actions | Manual email regex L26; dup code-gen |
| `app/admin/customers/customers-client.tsx:1-135` | 135 | Client | Client-side filter all data |
| `app/admin/customers/new/page.tsx:1-77` | 77 | RSC form | Clean |
| `app/admin/customers/[id]/page.tsx:1-147` | 147 | RSC | Revenue/debt calc in RSC L36-41 |
| `app/admin/customers/[id]/edit/page.tsx:1-99` | 99 | RSC form | Clean |

### 3. PACKAGES
| File | LOC | Pattern | Issues |
|---|---:|---|---|
| `app/admin/packages/page.tsx:8-24` | 17 | RSC | N+1 order.customer |
| `app/admin/packages/actions.ts:1-170` | 170 | Server actions | calculateWeights dup from orders L70 vs orders L202 |
| `app/admin/packages/packages-client.tsx:1-151` | 151 | Client | Client-side filter |
| `app/admin/packages/new/page.tsx:30-120` | 91 | RSC form | Loads ALL orders, no pagination |
| `app/admin/packages/[id]/page.tsx:9-95` | 87 | RSC | Clean |
| `app/admin/packages/[id]/edit/page.tsx:33-117` | 84 | RSC form | Nested ternary redirect L121-122 |

### 4. SERVICES
| File | LOC | Pattern | Issues |
|---|---:|---|---|
| `app/admin/services/page.tsx:8-30` | 23 | RSC | Clean |
| `app/admin/services/actions.ts:1-110` | 110 | Server actions | `isActive == "on"` fragile string check |
| `app/admin/services/services-client.tsx:1-187` | 187 | Client | Large component; 3 selects + filter |
| `app/admin/services/new/page.tsx:4-100` | 96 | RSC form | Object.values(enum).map pattern (good) |
| `app/admin/services/[id]/edit/page.tsx:9-125` | 116 | RSC form | Same enum pattern |

### 5. COST-RATES
| File | LOC | Pattern | Issues |
|---|---:|---|---|
| `app/admin/cost-rates/page.tsx:8-123` | 116 | RSC | latestUpdatedAt computed in render loop |
| `app/admin/cost-rates/actions.ts:1-210` | 210 | Server actions | 46-row hardcoded DEFAULT_COST_RATE_ROWS L30-77; custom parseAmountValue |
| `app/admin/cost-rates/cost-rates-client.tsx:1-124` | 124 | Client | In-memory filter |
| `app/admin/cost-rates/new/cost-rate-new-form.tsx:39-266` | 227 | Client (heavy) | Excel paste parse L74-91; 46 useState inputs |

**Anti-patterns**: weight rows defined twice (`actions.ts` + `weight-rows.ts`); custom currency parser.

### 6. COST-ITEMS
| File | LOC | Pattern | Issues |
|---|---:|---|---|
| `app/admin/cost-items/page.tsx:9-76` | 68 | RSC | Simple |
| `app/admin/cost-items/actions.ts:1-55` | 55 | Server actions | dataFromForm pattern L17-30 |
| `app/admin/cost-items/new/page.tsx:1-20` | 20 | RSC | 3 form controls crammed one line L11-12 |
| `app/admin/cost-items/[id]/edit/page.tsx:8-30` | 30 | RSC | Same compactness |

### 7. PICKUPS
| File | LOC | Pattern | Issues |
|---|---:|---|---|
| `app/admin/pickups/page.tsx:10-206` | 197 | RSC | URL-param filters via form L51, no debounce |
| `app/admin/pickups/actions.ts:1-197` | 197 | Server actions | `createPickupRequest` returns `{id}`, others throw (inconsistent) |
| `app/admin/pickups/actions/route.ts` | - | Route handler | Custom fetch target — inconsistent |
| `app/admin/pickups/new/page.tsx:7-68` | 62 | RSC loader | Prefetches customers/drivers |
| `app/admin/pickups/new/pickup-new-form.tsx:1-379` | 379 | Client | Manual fetch to `/admin/pickups/actions` L35; try/catch + state |
| `app/admin/pickups/[id]/page.tsx:12-393` | 382 | RSC detail | Sidebar actions all disabled L345-357 |

**Anti-patterns**: client form calls custom REST handler rather than server action; mixes throw + return; hardcoded timeline; status log not atomic with status update L92-103.

### 8. DRIVERS
| File | LOC | Pattern | Issues |
|---|---:|---|---|
| `app/admin/drivers/page.tsx:7-208` | 202 | RSC + filters | server-side filter (good); includes pickupRequests filtered |
| `app/admin/drivers/actions.ts:1-101` | 101 | Server actions | throws on failure (inconsistent w/ orders/customers); dup code-gen L23-40 |
| `app/admin/drivers/new/page.tsx:6-21` | 16 | RSC | Wrapper |
| `app/admin/drivers/new/driver-new-form.tsx:7-143` | 137 | Client | useRouter + manual fetch; catch sets error state |
| `app/admin/drivers/[id]/page.tsx:9-299` | 291 | RSC detail | Stats in RSC L32-43 |
| `app/admin/drivers/[id]/edit/driver-edit-form.tsx:12-154` | 143 | Client | Same fetch+state pattern |

## Cross-Cutting Findings

**Forms**: Manual `getText/getNumber/requireValue` re-implemented in every `actions.ts` (8 copies). No Zod. Enum validation duplicated. Error handling split: some redirect with error param, some throw.

**Tables**: All list pages load full table → client filter. No server pagination. No debounce. Search UI copy-pasted in orders / services / cost-rates / drivers / pickups.

**Server action shape**: Orders/Packages/Customers redirect-on-success. Pickups/Drivers throw + return `{id}`. **No consistent contract.**

**Validation coverage**: Manual only, runtime, no schema. No sanitization.

**Authn/Authz**: ZERO. No middleware, no role checks. All `/admin/*` open. **Production-blocking.**

**Transactions**: Orders `$transaction` L230 (good). Cost-rates L166 (good). Pickups + drivers + extras NOT atomic with status log / related writes — race conditions possible.

**N+1 risks**:
- `customers/page.tsx` orders { payments } nested — heavy
- `customers/[id]/page.tsx` same
- `cost-rates/page.tsx:53-58` latestUpdatedAt loop ~ N additional queries
- `orders/[id]/page.tsx` 6 relations one shot (acceptable, but no pagination on packages)
- `drivers/[id]/page.tsx` pickupRequests { customer } nested

**Error/loading**: No `error.tsx`, no `loading.tsx`, no boundaries. Only pickup/driver client forms have local `isSubmitting`. Order new form has none.

**Form state**: Mix of plain HTML, form action serverAction, manual `fetch()` + useState, querySelector DOM patches. **No convention.**

## Duplication Map

| Pattern | Files | Severity |
|---|---|---|
| `getText/getNumber/requireValue/getOptionalText` | 8 actions.ts | HIGH (8 copies) |
| Code-gen `XXX-YYMMDD-NNNN` | orders:104, packages:57, pickups:41, drivers:23, customers | CRITICAL (5 variants) |
| `calculateVolumetric/ChargeableWeight` | orders:202, packages:70 | MEDIUM (2 copies) |
| Status badges/labels | 6 modules | MEDIUM (scattered) |
| Form label+input boilerplate | 100+ inputs | MEDIUM (no FieldGroup component) |
| Client-side filter useMemo | 5 modules | MEDIUM |

## Verdict (module layer)

**Application shell needs rewrite** (8/10 severity):
1. No validation library — every action hand-rolled
2. No auth at all
3. Inconsistent action contracts
4. Severe duplication (~18% of ~4500 LOC)
5. N+1 in list views, no pagination
6. Missing atomic writes in pickups/drivers
7. Zero error boundaries
8. Fragile querySelector DOM patches in order form

## Unresolved questions
- Is pickups `/admin/pickups/actions/route.ts` route handler an oversight or intentional (mobile client target)?
- Are sidebar actions in pickup detail intentionally disabled (feature in progress) or stale?
