# Phase 06 — Module Port: Pickups, Drivers

## 1. Context
- Parent: [plan.md](./plan.md)
- Depends on: phase-03 (foundations + FileAsset), phase-04 (template)
- Source: [scout/scout-01-admin-modules.md §7,§8](./scout/scout-01-admin-modules.md)

## 2. Overview
- Date: 2026-05-17
- Description: Port pickups + drivers. Fix inconsistent contracts (some throw, some return `{id}`), kill ad-hoc REST handler, enforce atomic status-log writes, route pickup photos through FileAsset.
- Priority: M
- Implementation status: not started
- Review status: pending

## 3. Key Insights
- `app/admin/pickups/actions/route.ts` is ad-hoc tech debt from rushed AI build (Q8 confirmed). DELETE on port; client form uses `defineAction` server actions instead.
- `pickups/actions.ts:92-103` writes status update + status log NOT in a transaction → race condition.
- `pickups/actions.ts` mixes return shapes: `createPickupRequest` returns `{id}`, others throw. Phase-03 contract makes all uniform.
- `pickups/[id]/page.tsx:345-357` has disabled sidebar actions — confirm intent (unresolved Q from scout-01) before porting.
- `drivers/actions.ts:1-101` throws on failure, uses dup codegen `L23-40` — both fixed by phase-03 wrapper + lib/codegen.
- `drivers/new/driver-new-form.tsx` and `[id]/edit/driver-edit-form.tsx` use manual fetch + useState; convert to RHF + useActionState.
- PickupPhoto refactored to FileAsset in phase 02; pickup form upload now goes through `/api/upload` → R2 → FileAsset row → relation.

## 4. Requirements

**Functional**
- Pickups: list (filterable: status, driver, date), new (with photos), detail (status update writes log atomically, assign driver, cancel).
- Drivers: list, new, detail (active pickups, history), edit, deactivate (soft).
- Photo upload: drag/drop, max N files, validates mime + size, uploads to R2 via presigned PUT, creates FileAsset rows, links to PickupRequest. (R2 presigned URLs preferred over server-proxy for free-tier egress savings.)
- **Driver PWA portal** (`/(driver)/*` route group): mobile-first responsive views for the driver-role user — list assigned pickups, update status (PICKED_UP/FAILED/ARRIVED), capture photos via device camera, add notes. PWA manifest + service worker for installability. Same Next app, same actions layer, different shell + auth-gated by `User.role = DRIVER`.
- All actions return `ActionResult`; uniform contract.
- Status change + PickupStatusLog write inside single `$transaction`.

**Non-functional**
- Photo upload progress UI.
- File size cap (e.g. 5 MB per photo) + mime allowlist.
- Driver list filterable by active status + assigned-pickups count.

## 5. Architecture

### File upload flow
```
client → POST /api/v1/uploads (multipart, multi-file)
         server: validate mime+size → R2 upload → create FileAsset rows
         response: { assets: FileAsset[] }
client → submit pickup form with assetIds[]
         server action: defineAction({ ... }) creates PickupRequest +
                       PickupPhoto rows linking to FileAsset (in $transaction)
```

### Atomic status-log
```ts
updatePickupStatus = defineAction({
  schema: updatePickupStatusSchema,
  handler: async ({ id, status, note }, ctx) => {
    return prisma.$transaction(async (tx) => {
      const before = await tx.pickupRequest.findUniqueOrThrow({ where: { id }});
      const after  = await tx.pickupRequest.update({ where: { id }, data: { status }});
      await tx.pickupStatusLog.create({
        data: { pickupRequestId: id, fromStatus: before.status, toStatus: status, note, userId: ctx.user.id }
      });
      await audit(tx, "pickup.statusChange", "PickupRequest", id, before, after, ctx.user.id);
      return after;
    });
  },
});
```

### Folder layout
```
features/pickups/
  schemas.ts          # create, updateStatus, assignDriver, cancel
  queries.ts
  actions.ts
  components/
    pickup-form.tsx
    pickup-photo-uploader.tsx
    pickup-status-form.tsx
    pickup-process-flow.tsx (wraps generic ProcessFlow w/ pickup adapter)
features/drivers/
  schemas.ts
  queries.ts
  actions.ts
  components/driver-form.tsx
app/(admin)/pickups/...
app/(admin)/drivers/...
app/api/v1/uploads/route.ts
```

## 6. Related Code Files (old repo)
- `app/admin/pickups/page.tsx:10-206`
- `app/admin/pickups/actions.ts:1-197` (drop `route.ts`)
- `app/admin/pickups/actions/route.ts` (DELETE)
- `app/admin/pickups/new/page.tsx:7-68`
- `app/admin/pickups/new/pickup-new-form.tsx:1-379` (rewrite — drop manual fetch L35)
- `app/admin/pickups/[id]/page.tsx:12-393` (check L345-357 disabled actions)
- `app/admin/drivers/page.tsx:7-208`
- `app/admin/drivers/actions.ts:1-101` (drop dup codegen L23-40)
- `app/admin/drivers/new/page.tsx:6-21`
- `app/admin/drivers/new/driver-new-form.tsx:7-143` (convert to RHF)
- `app/admin/drivers/[id]/page.tsx:9-299` (stats via aggregate query)
- `app/admin/drivers/[id]/edit/driver-edit-form.tsx:12-154`

## 7. Implementation Steps
1. Delete `pickups/actions/route.ts` (Q8 = tech debt, not mobile target). Confirm whether sidebar actions in pickup detail are intentionally disabled or stale; restore or remove dead UI accordingly.
2. Build `POST /api/v1/uploads/route.ts`: parses multipart, validates (mime + size), uploads to R2, returns FileAsset[].
3. Build `PickupPhotoUploader` client component (RHF-compatible field). Stores `assetIds: string[]`.
4. **Pickups**:
   - Zod schemas (create, updateStatus, assignDriver, cancel).
   - `queries.listPickups({ status, driverId, dateFrom, dateTo, page })`.
   - `actions.ts`: all wrapped in `defineAction`, uniform `ActionResult`.
   - `updatePickupStatus` enforces atomic tx (sample above).
   - `createPickupRequest` inserts pickup + PickupPhoto rows in single tx.
   - `assignDriver` checks driver active state.
   - Delete `app/admin/pickups/actions/route.ts` from old port plan.
   - Build form with RHF + photo uploader; drop manual fetch.
5. **Drivers**:
   - Schemas + queries + actions per template.
   - Driver code generated via `lib/codegen.ts`.
   - Driver stats (`active pickups`, `completed last 30d`) computed via `prisma.pickupRequest.groupBy` or aggregate, NOT in RSC render.
   - `deactivateDriver` action — soft via `isActive: false`; reject if active pickups assigned.
   - Driver forms converted to RHF + useActionState.
6. Restore sidebar actions in pickup detail page if confirmed intentional; otherwise remove dead UI.
7. Playwright smoke: create pickup with 2 photos → assign driver → mark PICKED_UP → verify status log + audit log written.
8. Vitest: status-transition matrix (valid PickupStatus → next states).

## 8. Todo
- [ ] Resolve route.ts + disabled actions questions
- [ ] /api/v1/uploads endpoint
- [ ] PickupPhotoUploader component
- [ ] Pickups schemas + queries + actions
- [ ] Atomic status-log tx
- [ ] PickupForm RHF (drop manual fetch)
- [ ] Drivers schemas + queries + actions
- [ ] Driver code via lib/codegen
- [ ] Driver stats via aggregate
- [ ] DriverForm RHF
- [ ] Deactivate guard (no active pickups)
- [ ] Playwright smoke
- [ ] Status transition tests

## 9. Success Criteria
- No `route.ts` ad-hoc endpoints in `/admin/*`.
- All actions across pickups + drivers return uniform `ActionResult` (zero `throw`).
- Every PickupRequest status change has a matching PickupStatusLog row (DB-level check).
- Every pickup photo backed by FileAsset row + R2 URL.
- Driver detail page renders < 200ms via aggregate, not loops.
- Manual fetch + useState pattern fully eliminated.

## 10. Risk Assessment
| Risk | Mitigation |
|---|---|
| R2 free-tier quota hit | Monitor; FileAsset abstraction supports swap to S3/Backblaze |
| Photo upload during pickup form submit causes orphan FileAssets if cancel | Upload-first pattern → orphan cleanup cron after 24h |
| Driver PWA service worker conflicts with admin app caching | Scope SW to `/(driver)/*` paths only; admin app unaffected |
| Status transition matrix incomplete | Encode allowed transitions as `Record<PickupStatus, PickupStatus[]>`; validate in action |
| Driver deactivation breaks foreign keys | Soft-delete only (`isActive` flag); never DELETE |

## 11. Security Considerations
- `POST /api/v1/uploads` requires authenticated admin/staff session.
- File size cap enforced server-side (re-validated after R2).
- Mime allowlist: `image/jpeg`, `image/png`, `image/webp` only.
- FileAsset URLs are public R2 CDN by default — acceptable for non-sensitive product photos. Pickup photos that may contain customer ID/personal data → upload to private bucket prefix, serve via presigned GET only (`FileAsset.visibility = PRIVATE`).
- Audit log per pickup status change + per driver state change.
- Rate limit `/api/v1/uploads` (e.g. 30 req/min/user).

## 12. Next Steps
Proceed to [phase-07-ui-ux-refresh.md](./phase-07-ui-ux-refresh.md). Phase 07 may run in parallel with phases 04-06 once phase-03 primitives are stable.
