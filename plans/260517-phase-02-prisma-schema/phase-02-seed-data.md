# Phase 02 · Seed Script + Sample Data

## Context links

- [Plan overview](./plan.md)
- [Phase 01 schema](./phase-01-prisma-schema.md)
- [Researcher 02: Logistics domain](./research/researcher-02-logistics-domain.md)

## Overview

- **Date**: 2026-05-17
- **Description**: Create `prisma/seed.ts` that populates DB with realistic Vietnamese logistics data: 1 admin user + 3 driver users, 3 drivers, 5 customers (mixed individual/business), 5 shipping services, full 46-row rate table for EZW-AIR-EU + sparse rates for others, ~15 cost items, 3-5 sample orders covering all `PickupMethod` variants, ≥1 `PickupRequest` with status log + 1 photo.
- **Priority**: P0 — required for Phase 03 UI demos.
- **Implementation status**: Not Started
- **Review status**: Not Reviewed

## Key Insights

- Seed is config-driven in Prisma v7 — set `migrations.seed` in `prisma.config.ts` ([researcher-01 §4](./research/researcher-01-prisma7-patterns.md)).
- Wrap all inserts in `prisma.$transaction([...])` so a partial failure leaves DB clean.
- Use `upsert` keyed on `code`/`email` so reruns are idempotent.
- Weight tiers: 0.5→20.5 step 0.5 = 41 rows (FIXED_TOTAL). Plus 21-44, 45-99, 100-299, 300-499, 500+ = 5 rows (PER_KG). Total 46 rows per service.
- Order `code` generator: `EZW-${YYMM}-${seq}` where `seq` is 4-digit zero-padded.
- Seeded sample orders compute `chargeableWeightKg`, `baseRateSnapshotVnd`, `baseCostVnd`, `extraCostTotalVnd`, `totalFeeVnd`, `profitVnd` using Phase 03 helpers (import after Phase 03 lands; until then, hardcode in seed).

## Requirements

| # | Requirement |
|---|-------------|
| R1 | Seed runs via `npx prisma db seed` (configured in `prisma.config.ts`) |
| R2 | Idempotent: rerun does NOT duplicate rows (use `upsert` on natural keys) |
| R3 | Single `prisma.$transaction` wraps inserts |
| R4 | 1 admin User (`admin@ezway.local`) + 3 driver Users |
| R5 | 3 Drivers (MOTORBIKE / VAN / TRUCK) |
| R6 | 5 Customers (3 individual, 2 business) |
| R7 | 5 ShippingServices (EZW-AIR-US-PRI, EZW-AIR-US-ECO, EZW-SEA-US, EZW-SEA-CAD, EZW-AIR-EU) |
| R8 | 46-row rate table for **EZW-AIR-EU** (full); other services get sparse 5-10 rows each |
| R9 | ~15 CostItems covering all categories (PICKUP, PACKAGING, CUSTOMS_SURCHARGE, OPERATION) and pricing types |
| R10 | 3-5 Orders covering NONE, EZWAY_PICKUP, CUSTOMER_DROP_OFF, THIRD_PARTY |
| R11 | ≥1 PickupRequest with 1 status log + 1 placeholder photo |
| R12 | Add `tsx` to `devDependencies` |
| R13 | Update `prisma.config.ts` with `migrations.seed` |

## Architecture

### File structure

```
prisma/
├── schema.prisma              (Phase 01)
├── seed.ts                    (this phase — entry point)
└── seed/                      (optional split if seed.ts gets big)
    ├── users.ts
    ├── services.ts
    ├── rates.ts
    ├── customers.ts
    ├── cost-items.ts
    ├── drivers.ts
    └── orders.ts
```

For Phase 02, **single `prisma/seed.ts`** acceptable (KISS). Split only if >300 lines.

### `prisma.config.ts` change

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

### `package.json` devDep addition

```bash
npm i -D tsx
```

Result: `"tsx": "^4.x.x"` added.

### Seed data — exact shape

**Users (4 rows)**:

| email                    | name              | role   |
|--------------------------|-------------------|--------|
| admin@ezway.local        | Quản trị viên     | ADMIN  |
| driver.bike@ezway.local  | Nguyễn Văn Bike   | DRIVER |
| driver.van@ezway.local   | Trần Thị Van      | DRIVER |
| driver.truck@ezway.local | Lê Văn Truck      | DRIVER |

**Drivers (3 rows)** — linked to driver users:

| user                  | vehicleType | vehiclePlate | phone        |
|-----------------------|-------------|--------------|--------------|
| driver.bike@…         | MOTORBIKE   | 29-A1 12345  | 0901234567   |
| driver.van@…          | VAN         | 51C-678.90   | 0902345678   |
| driver.truck@…        | TRUCK       | 50H-111.22   | 0903456789   |

**Customers (5 rows)**:

| code      | name                          | phone       | isBusiness | address                                                |
|-----------|-------------------------------|-------------|------------|--------------------------------------------------------|
| CUS-0001  | Nguyễn Thị Hương              | 0911111111  | false      | 12 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM                    |
| CUS-0002  | Trần Văn Minh                 | 0922222222  | false      | 45 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM                |
| CUS-0003  | Phạm Thị Lan                  | 0933333333  | false      | 78 Hai Bà Trưng, Hoàn Kiếm, Hà Nội                     |
| CUS-0004  | Công ty TNHH Thương mại ABC   | 0944444444  | true       | 100 Điện Biên Phủ, Q.3, TP.HCM (MST: 0312345678)       |
| CUS-0005  | Công ty CP XNK Phương Đông    | 0955555555  | true       | Lô 5, KCN Tân Bình, TP.HCM (MST: 0398765432)           |

**ShippingServices (5 rows)**:

| code             | name                                  | transportType | destinationCode | destinationName | volumetricDivisor |
|------------------|---------------------------------------|---------------|-----------------|-----------------|-------------------|
| EZW-AIR-US-PRI   | EZWay Air US Premium                  | AIR           | US              | Hoa Kỳ          | 5000              |
| EZW-AIR-US-ECO   | EZWay Air US Economy                  | AIR           | US              | Hoa Kỳ          | 6000              |
| EZW-SEA-US       | EZWay Sea US                          | SEA           | US              | Hoa Kỳ          | 6000              |
| EZW-SEA-CAD      | EZWay Sea Canada                      | SEA           | CA              | Canada          | 6000              |
| EZW-AIR-EU       | EZWay Air Europe                      | AIR           | EU              | Châu Âu         | 5000              |

**ServiceCostRate — full table for EZW-AIR-EU (46 rows)**:

FIXED_TOTAL tiers (`minWeightKg`, `maxWeightKg`, `amountVnd`):

| min  | max  | amountVnd |
|------|------|-----------|
| 0.5  | 0.5  | 350000    |
| 1.0  | 1.0  | 550000    |
| 1.5  | 1.5  | 700000    |
| 2.0  | 2.0  | 850000    |
| 2.5  | 2.5  | 1000000   |
| 3.0  | 3.0  | 1150000   |
| 3.5  | 3.5  | 1300000   |
| 4.0  | 4.0  | 1450000   |
| 4.5  | 4.5  | 1600000   |
| 5.0  | 5.0  | 1750000   |
| 5.5  | 5.5  | 1900000   |
| 6.0  | 6.0  | 2050000   |
| 6.5  | 6.5  | 2200000   |
| 7.0  | 7.0  | 2350000   |
| 7.5  | 7.5  | 2500000   |
| 8.0  | 8.0  | 2650000   |
| 8.5  | 8.5  | 2800000   |
| 9.0  | 9.0  | 2950000   |
| 9.5  | 9.5  | 3100000   |
| 10.0 | 10.0 | 3250000   |
| 10.5 | 10.5 | 3400000   |
| 11.0 | 11.0 | 3550000   |
| 11.5 | 11.5 | 3700000   |
| 12.0 | 12.0 | 3850000   |
| 12.5 | 12.5 | 4000000   |
| 13.0 | 13.0 | 4150000   |
| 13.5 | 13.5 | 4300000   |
| 14.0 | 14.0 | 4450000   |
| 14.5 | 14.5 | 4600000   |
| 15.0 | 15.0 | 4750000   |
| 15.5 | 15.5 | 4900000   |
| 16.0 | 16.0 | 5050000   |
| 16.5 | 16.5 | 5200000   |
| 17.0 | 17.0 | 5350000   |
| 17.5 | 17.5 | 5500000   |
| 18.0 | 18.0 | 5650000   |
| 18.5 | 18.5 | 5800000   |
| 19.0 | 19.0 | 5950000   |
| 19.5 | 19.5 | 6100000   |
| 20.0 | 20.0 | 6250000   |
| 20.5 | 20.5 | 6400000   |

(41 FIXED_TOTAL rows; formula: 200000 + 300000*minWeight rounded — implementor may generate via loop.)

PER_KG tiers (`rateType: PER_KG`, `amountVnd` is per-kg):

| min   | max   | amountVnd (per kg) |
|-------|-------|--------------------|
| 21.0  | 44.0  | 295000             |
| 45.0  | 99.0  | 275000             |
| 100.0 | 299.0 | 255000             |
| 300.0 | 499.0 | 235000             |
| 500.0 | 9999.0| 215000             |

Total: **46 rows**.

**Other services — sparse 5-10 rows each** (just enough to demo). Example for EZW-SEA-US (5 rows, all PER_KG, much cheaper):

| min | max  | rateType | amountVnd |
|-----|------|----------|-----------|
| 1   | 49   | PER_KG   | 55000     |
| 50  | 99   | PER_KG   | 48000     |
| 100 | 299  | PER_KG   | 42000     |
| 300 | 499  | PER_KG   | 38000     |
| 500 | 9999 | PER_KG   | 32000     |

(Implementor: pick reasonable VND values for other 3 services, similar pattern.)

**CostItems (~15 rows)**:

| code              | name                                       | category          | pricingType  | defaultAmountVnd | unitLabel |
|-------------------|--------------------------------------------|-------------------|--------------|------------------|-----------|
| PICKUP-CITY-50    | Pickup nội thành dưới 50kg                 | PICKUP            | FLAT_RATE    | 100000           | lần       |
| PICKUP-CITY-100   | Pickup nội thành 50-100kg                  | PICKUP            | FLAT_RATE    | 150000           | lần       |
| PICKUP-CITY-300   | Pickup nội thành 100-300kg                 | PICKUP            | FLAT_RATE    | 200000           | lần       |
| PICKUP-CITY-300P  | Pickup nội thành ≥300kg                    | PICKUP            | FLAT_RATE    | 300000           | lần       |
| PICKUP-SUB-BASE   | Pickup ngoại thành phí cơ bản (≤20km)     | PICKUP            | FLAT_RATE    | 300000           | điểm      |
| PICKUP-SUB-KM     | Pickup ngoại thành phụ phí từ km thứ 21    | PICKUP            | PER_KM       | 15000            | km        |
| PACK-CARTON-STD   | Thùng carton tiêu chuẩn                    | PACKAGING         | PER_UNIT     | 30000            | kiện      |
| PACK-FOAM-S       | Thùng xốp nhỏ                              | PACKAGING         | PER_UNIT     | 60000            | kiện      |
| PACK-FOAM-L       | Thùng xốp lớn                              | PACKAGING         | PER_UNIT     | 80000            | kiện      |
| PACK-THERM-S      | Túi giữ nhiệt nhỏ                          | PACKAGING         | PER_UNIT     | 110000           | kiện      |
| PACK-THERM-L      | Túi giữ nhiệt lớn                          | PACKAGING         | PER_UNIT     | 150000           | kiện      |
| PACK-WOOD-CRATE   | Kiện gỗ đóng hàng                          | PACKAGING         | QUOTE        | null             | kiện      |
| CUS-FOOD          | Phụ phí hải quan hàng thịt/trứng/sữa       | CUSTOMS_SURCHARGE | QUOTE        | null             | lần       |
| CUS-DANGER        | Phụ phí hàng pin/sơn gel/hóa chất          | CUSTOMS_SURCHARGE | QUOTE        | null             | lần       |
| OPS-OVERHEAD      | Chi phí vận hành                           | OPERATION         | FLAT_RATE    | 50000            | đơn       |

**Orders — 4 sample orders**:

| code           | customer  | service          | pickupMethod        | chargeableKg | notes                                |
|----------------|-----------|------------------|---------------------|--------------|--------------------------------------|
| EZW-2605-0001  | CUS-0001  | EZW-AIR-EU       | EZWAY_PICKUP        | 3.5          | Has PickupRequest (PENDING)          |
| EZW-2605-0002  | CUS-0002  | EZW-AIR-US-PRI   | CUSTOMER_DROP_OFF   | 7.0          | No pickup, no extra pickup cost      |
| EZW-2605-0003  | CUS-0004  | EZW-SEA-US       | THIRD_PARTY         | 120          | Provider=GRAB; pickup as OrderExtraCost |
| EZW-2605-0004  | CUS-0005  | EZW-AIR-US-ECO   | NONE                | 2.0          | Customer brought to warehouse       |

Each order: 1 Package with computed `volumetricWeightKg` + `chargeableWeightKg`; 1-2 `OrderExtraCost` rows (e.g., packaging + ops); 1 Payment in `UNPAID` state.

**PickupRequest for EZW-2605-0001**:
- `currentStatus: PENDING`, `driverId: null` initially
- 1 `PickupStatusLog`: `fromStatus: null, toStatus: PENDING, byUser: admin, note: "Tạo yêu cầu pickup"`
- 1 `PickupPhoto` placeholder: `photoUrl: "https://placeholder.ezway.local/pickup-before-1.jpg"`, `photoType: PICKUP_BEFORE`

### Seed script skeleton (`prisma/seed.ts`)

```typescript
import { PrismaClient, UserRole, VehicleType, CostRateType,
         CostCategory, CostPricingType, PickupMethod, PickupStatus,
         PickupPhotoType, ShippingTransportType, PaymentStatus,
         OrderStatus } from "../app/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    // 1. Users (upsert by email)
    const admin = await tx.user.upsert({ where: { email: "admin@ezway.local" }, ... });
    const driverBikeUser = await tx.user.upsert({ ... });
    const driverVanUser = await tx.user.upsert({ ... });
    const driverTruckUser = await tx.user.upsert({ ... });

    // 2. Drivers (upsert by userId)
    const driverBike = await tx.driver.upsert({ where: { userId: driverBikeUser.id }, ... });
    // ... van, truck

    // 3. Customers (upsert by code)
    // 4. ShippingServices (upsert by code)
    // 5. ServiceCostRates — bulk createMany, idempotent via deleteMany + create
    //    For EZW-AIR-EU: generate 41 FIXED_TOTAL rows in a loop
    //    Then 5 PER_KG rows
    // 6. CostItems (upsert by code)
    // 7. Orders (upsert by code) + Package + OrderExtraCost + Payment
    // 8. PickupRequest for order 0001 + PickupStatusLog + PickupPhoto
  }, { timeout: 30000 });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

**Rate generation loop**:

```typescript
const euRates: Array<{ minWeightKg: number; maxWeightKg: number; rateType: CostRateType; amountVnd: number }> = [];
for (let w = 0.5; w <= 20.5; w += 0.5) {
  const amount = 200_000 + Math.round(300_000 * w);   // pick a formula; tweak to match table
  euRates.push({ minWeightKg: w, maxWeightKg: w, rateType: CostRateType.FIXED_TOTAL, amountVnd: amount });
}
euRates.push({ minWeightKg: 21,  maxWeightKg: 44,   rateType: CostRateType.PER_KG, amountVnd: 295_000 });
euRates.push({ minWeightKg: 45,  maxWeightKg: 99,   rateType: CostRateType.PER_KG, amountVnd: 275_000 });
euRates.push({ minWeightKg: 100, maxWeightKg: 299,  rateType: CostRateType.PER_KG, amountVnd: 255_000 });
euRates.push({ minWeightKg: 300, maxWeightKg: 499,  rateType: CostRateType.PER_KG, amountVnd: 235_000 });
euRates.push({ minWeightKg: 500, maxWeightKg: 9999, rateType: CostRateType.PER_KG, amountVnd: 215_000 });
```

For idempotency on rates: `await tx.serviceCostRate.deleteMany({ where: { serviceId: euService.id } })` then `createMany({ data: euRates.map(r => ({ ...r, serviceId: euService.id })) })`.

## Related code files

- `prisma/seed.ts` — NEW
- `prisma.config.ts` — EDIT (add `migrations.seed`)
- `package.json` — EDIT (add `tsx` devDep)
- `lib/domain/*` — used by seed AFTER Phase 03 lands (until then, hardcode order totals)

## Implementation Steps

1. `npm i -D tsx`.
2. Edit `prisma.config.ts` to add `migrations.seed: "tsx prisma/seed.ts"`.
3. Create `prisma/seed.ts` with skeleton above.
4. Implement users + drivers section. Test by running `npx prisma db seed`.
5. Implement customers + services. Test rerun → idempotent.
6. Implement rate generation loop (EZW-AIR-EU full, others sparse). Verify 46 rows for EZW-AIR-EU in DB.
7. Implement cost items.
8. Implement 4 sample orders + packages + extra costs + payments.
9. Implement PickupRequest + 1 PickupStatusLog + 1 PickupPhoto for order 0001.
10. Run `npx prisma db seed` twice; confirm no duplicate rows.
11. Log a summary to stdout: `✓ Seeded: 4 users, 3 drivers, 5 customers, 5 services, 56 rates, 15 cost items, 4 orders, 1 pickup`.

## Todo list

- [ ] `npm i -D tsx`
- [ ] Update `prisma.config.ts` with `migrations.seed`
- [ ] Create `prisma/seed.ts` skeleton with transaction wrapper
- [ ] Seed 4 users (1 admin + 3 drivers)
- [ ] Seed 3 drivers
- [ ] Seed 5 customers
- [ ] Seed 5 shipping services
- [ ] Generate 46 rates for EZW-AIR-EU (41 FIXED + 5 PER_KG)
- [ ] Seed sparse rates for other 4 services (5-10 each)
- [ ] Seed 15 cost items
- [ ] Seed 4 sample orders (one per PickupMethod)
- [ ] Seed packages for each order
- [ ] Seed 1-2 OrderExtraCost per order
- [ ] Seed 1 Payment per order (UNPAID)
- [ ] Seed PickupRequest for order 0001 + StatusLog + Photo
- [ ] Run `npx prisma db seed` — succeeds
- [ ] Rerun — no duplicates (idempotent)
- [ ] Stdout summary printed

## Success Criteria

- `npx prisma db seed` exits 0
- Rerun → same row counts (idempotent)
- DB has exactly: 4 users, 3 drivers, 5 customers, 5 services, ≥56 rates, 15 cost items, 4 orders, 4 packages, ≥4 extra costs, 4 payments, 1 pickup request, 1 status log, 1 photo
- `prisma.serviceCostRate.count({ where: { service: { code: "EZW-AIR-EU" } } })` = 46

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Rate generation off-by-one (weight tier 21 overlaps 20.5) | Med | Use `maxWeightKg = 20.5` for last FIXED tier, `minWeightKg = 21.0` for first PER_KG — no overlap |
| Float drift in weight loop (0.5 + 0.5 + ... ≠ 1.0) | Med | Use `Math.round(w * 10) / 10` or multiply by 2 in loop |
| Seed transaction timeout on 56 rate inserts | Low | Set `timeout: 30000` in `$transaction` opts; use `createMany` for rates |
| `tsx` not picked up by Prisma CLI | Low | Verify via `npx prisma db seed --help` or test run |
| Order totals hardcoded wrong (mismatch with Phase 03 helpers) | Med | Recompute orders after Phase 03 lands; or import helpers if order doesn't matter |

## Security Considerations

- Seed users have NO passwords (auth out of scope). Phase 04 auth must reset/set passwords for these emails.
- `placeholder.ezway.local` URL is fake — fine for Phase 02, must be replaced before any photo display.
- No production seed gate — Phase 02 seed is dev-only. Add `if (process.env.NODE_ENV === "production") throw` if paranoid.

## Next steps

After this phase: [Phase 03 · Domain helpers](./phase-03-domain-helpers.md) provides reusable math for order totals (seed can later import them).
