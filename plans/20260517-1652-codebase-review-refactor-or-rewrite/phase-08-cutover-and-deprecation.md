# Phase 08 — Cutover & Deprecation

## 1. Context
- Parent: [plan.md](./plan.md)
- Depends on: phase-02 (schema), phase-04, 05, 06 (modules ported), phase-07 (UI parity)
- Source: [research/researcher-01-frameworks-and-stack.md §3 "Strangler-Fig"](./research/researcher-01-frameworks-and-stack.md)

## 2. Overview
- Date: 2026-05-17
- Description: **Mode A — clean cutover** (Q1 confirmed: no real prod users, MVP internal only). Soft cutover — stop old, start new, archive old repo. No dual-write. Mode B retained only as reference if status changes mid-port.
- Priority: H
- Implementation status: not started
- Review status: pending

## 3. Key Insights
- Research-01 §3: full strangler-fig is overkill for solo-dev + <100 routes + zero/internal users — clean cutover is cheaper.
- Strangler-fig still useful for hedge: deploy new app at `v2.ezway.local` while old runs at `ezway.local`; flip DNS / proxy once verified.
- Dual-write window only needed if old app continues to receive writes during migration → solo dev probably won't operate both, so skip dual-write.
- Phase 02 data migration script handles one-shot data move.
- Old repo becomes read-only reference for ~30 days post-cutover, then archived to a `archive/` branch.

## 4. Requirements

**Functional**
- All 8 modules functional in new app and exercised by smoke E2E.
- Production DB provisioned (Neon paid tier if user count justifies; free tier otherwise).
- DNS / reverse proxy config staged.
- Data migration script run once on prod data.
- Rollback procedure documented.

**Non-functional**
- Cutover window ≤ 30 min downtime (single dev, low-traffic admin).
- Backups: old SQLite file + new Postgres dump immediately pre-cutover.
- All AuditLog rows from old app preserved (migrate as historical entries).
- Monitoring: basic uptime check + error alerting.

## 5. Architecture

### Cutover mode: **A — Clean cutover (LOCKED)**
Q1 = no production users → no need for strangler-fig dual-write. Reset DB freely if needed during dev.

**Mode A — Clean cutover (CHOSEN)**
```
1. Freeze old app (read-only mode or stop server)
2. Run export-old.ts → import-new.ts (phase 02)
3. Deploy new app to prod URL
4. Smoke test
5. Announce
6. Archive old
```

**Mode B — Strangler-fig (NOT USED — kept as reference only)**
```
1. Deploy new app to v2.ezway.com
2. Reverse proxy: route by path
   /admin/orders     → new (once tested)
   /admin/customers  → new
   /admin/*          → old (rest)
3. Migrate one module at a time, flipping proxy rule
4. Dual-write to both DBs? No — too complex for solo; instead lock writes per module during its flip.
5. Final flip: all /admin/* → new
6. Archive old
```

### Repo lifecycle
```
old repo (h-y-ng-vai-senior-full)
  └─ tag: pre-v2-final  (last commit before cutover)
  └─ branch: archive/legacy-2026
  └─ readme updated: "Archived 2026-MM-DD. See ezway-v2."

new repo (ezway-v2)
  └─ becomes primary
```

## 6. Related Code Files
- `scripts/export-old.ts` (phase 02)
- `scripts/import-new.ts` (phase 02)
- `docs/migration.md` (phase 02)
- All ported modules (phase 04-06)
- DNS / reverse proxy config (Vercel, Cloudflare, or self-host nginx)

## 7. Implementation Steps
1. **Pre-cutover checklist** (T-7 days):
   - [ ] All phase-04/05/06 smoke tests green.
   - [ ] Lighthouse a11y ≥ 90 (phase-07).
   - [ ] Manual QA pass: create order end-to-end → pickup → status updates → payment → audit log.
   - [ ] Backup strategy verified (Neon point-in-time recovery on, SQLite file copied).
   - [x] Q1 resolved → Mode A locked.
   - [ ] Choose hosting target (Vercel free vs paid; or self-host).
   - [ ] Set up basic uptime monitor (e.g. UptimeRobot free).
2. **T-1 day**:
   - [ ] Final dry-run of export + import on staging.
   - [ ] Row-count diff old vs new = 0 mismatches.
   - [ ] Smoke E2E green on staging.
3. **T-0 cutover (Mode A)**:
   - [ ] Stop old app (or set read-only banner).
   - [ ] Take SQLite backup.
   - [ ] Run export-old.ts → import-new.ts against prod Postgres.
   - [ ] Verify row counts.
   - [ ] Update DNS / Vercel domain alias to point new app.
   - [ ] Smoke test (login, create test order, view list).
   - [ ] Announce to internal users.
4. **T-0 cutover (Mode B, if chosen)**:
   - [ ] Deploy v2 to subdomain.
   - [ ] Configure reverse-proxy rules per module.
   - [ ] Flip orders module first (highest value). Test 24h.
   - [ ] Repeat per module weekly.
   - [ ] Final flip + DNS rotation.
5. **T+1 to T+30**:
   - [ ] Monitor error rate, AuditLog volume, DB metrics.
   - [ ] Bugs fixed in new repo only.
   - [ ] Old repo: tag `pre-v2-final`, README updated, branch `archive/legacy-2026`.
6. **T+30**:
   - [ ] Old hosting torn down (if still running).
   - [ ] Old DB file retained 90 days then deleted per data-retention policy.
   - [ ] Cutover retrospective documented.

## 8. Todo
- [ ] Pre-cutover checklist signed off
- [x] Mode A locked (Q1 = no prod users)
- [ ] Hosting target chosen
- [ ] Uptime monitor configured
- [ ] Backups verified
- [ ] Staging dry-run row-count match
- [ ] Cutover executed
- [ ] Smoke test post-cutover
- [ ] Old repo tagged + archive branch
- [ ] Old hosting torn down (T+30)
- [ ] Retro doc

## 9. Success Criteria
- New app live at primary URL, old app archived.
- Zero data loss (row counts old vs new match per table).
- Zero unhandled errors in first 24h post-cutover.
- Smoke test passes immediately post-cutover.
- Rollback plan exercised at least once on staging.
- AuditLog continuous (no gap across cutover).

## 10. Risk Assessment
| Risk | Mitigation |
|---|---|
| Data migration corrupts production rows | Run dry-run twice; never delete old SQLite until T+90 |
| DNS propagation delay extends downtime | Set TTL low (60s) 24h before cutover |
| Critical bug discovered post-cutover | Rollback plan: re-point DNS to old app + old SQLite (read-only) within 5 min |
| Better Auth users not migrated from old (no users to migrate, but seed admin must exist) | Seed initial admin via `prisma db seed` before cutover |
| Solo-dev fatigue → buggy cutover at midnight | Schedule cutover for low-traffic morning (Vietnam tz) with 4h buffer |
| Old AuditLog gap if dual-write skipped | Acceptable — record one explicit "cutover" entry as marker |

## 11. Security Considerations
- Pre-cutover: rotate `BETTER_AUTH_SECRET` for new app — never reuse dev secret.
- Backup files contain PII; store encrypted (Neon-side encrypted; local SQLite copy stored in encrypted disk).
- New app behind HTTPS only; HSTS header set.
- Admin role assigned manually to first user; no public sign-up route (or sign-up disabled).
- Rate limit auth endpoints (Better Auth supports).
- Smoke test does NOT include real customer data; use dedicated `test-admin@ezway.local` user.

## 12. Next Steps
Plan complete. Post-cutover, next plan should cover:
- Driver PWA hardening (offline mode, push notifications) — phase-06 ships baseline.
- Multi-tenant / multi-branch — deferred until SaaS direction confirmed (Q3).
- Public tracking page enhancements.
- Reporting / dashboard module.
- VAT e-invoice (GDT) export — deferred (Q4).
