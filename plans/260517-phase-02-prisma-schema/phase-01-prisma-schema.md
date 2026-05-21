# Phase 01 · Prisma Schema Design

## Context links

- [Plan overview](./plan.md)
- [Researcher 01: Prisma 7 patterns](./research/researcher-01-prisma7-patterns.md)
- [Researcher 02: Logistics domain](./research/researcher-02-logistics-domain.md)
- [Scout: current state](./scout/scout-01-current-state.md)

## Overview

- **Date**: 2026-05-17
- **Description**: Replace stub `prisma/schema.prisma` with full domain model — 14 models + 11 enums + all relations + indexes. Snapshot pattern on Order so historical rate changes never alter past orders. Soft delete on master data, append-only on logs.
- **Priority**: P0 — blocks Phase 02-04 and all UI wiring.
- **Implementation status**: Not Started
- **Review status**: Not Reviewed

## Key Insights

- Prisma 7 generator is `prisma-client` (NOT `prisma-client-js`); already correct in stub. Add `importFileExtension = "ts"` to dodge Turbopack ESM resolution. ([researcher-01 §1](./research/researcher-01-prisma7-patterns.md#1-prisma-7-generator-configuration))
- Snapshot rate on Order to prevent retroactive price changes. ([researcher-02 §1](./research/researcher-02-logistics-domain.md))
- Use `Int` VND (fits ±2.1B, safe per-order). No BigInt this phase.
- Tier lookup: `ServiceCostRate.(minWeightKg, maxWeightKg)` with composite unique. PER_KG tiers store unit rate; FIXED_TOTAL tiers store full price.
- Third-party pickup → no `PickupRequest`, just `OrderExtraCost` (PICKUP category). ([researcher-02 §9](./research/researcher-02-logistics-domain.md))
- Generic `AuditLog` (entityType + entityId strings, no FK).

## Requirements

| # | Requirement |
|---|-------------|
| R1 | 14 models: User, Customer, Order, Package, ShippingService, ServiceCostRate, CostItem, OrderExtraCost, Driver, PickupRequest, PickupPhoto, PickupStatusLog, Payment, AuditLog |
| R2 | 11 enums: UserRole, OrderStatus, PaymentStatus, ShippingTransportType, CostRateType, CostCategory, CostPricingType, PickupMethod, PickupStatus, VehicleType, PickupPhotoType |
| R3 | Snapshot rate on Order (`baseRateSnapshotVnd`, `serviceCostRateIdSnapshot`, `chargeableWeightKg`) |
| R4 | Soft delete on Customer, Order, ShippingService, CostItem, Driver (`deletedAt`) |
| R5 | Composite uniques + indexes per researcher-02 §2, §5 |
| R6 | Order.code `EZW-YYMM-NNNN` unique |
| R7 | `prisma generate` succeeds, no lint errors |

## Architecture

### Enum List

```prisma
enum UserRole              { ADMIN  STAFF  DRIVER }
enum OrderStatus           { DRAFT  PENDING  CONFIRMED  PICKING_UP  AT_WAREHOUSE  IN_TRANSIT  DELIVERED  CANCELLED }
enum PaymentStatus         { UNPAID  PARTIAL  PAID  REFUNDED }
enum ShippingTransportType { AIR  SEA }
enum CostRateType          { FIXED_TOTAL  PER_KG }
enum CostCategory          { PICKUP  PACKAGING  CUSTOMS_SURCHARGE  OPERATION  OTHER }
enum CostPricingType       { PER_UNIT  PER_KG  PER_KM  FLAT_RATE  QUOTE }
enum PickupMethod          { NONE  EZWAY_PICKUP  CUSTOMER_DROP_OFF  THIRD_PARTY }
enum PickupStatus          { PENDING  ASSIGNED  ACCEPTED  ON_THE_WAY  ARRIVED  PICKED_UP  FAILED  CANCELLED }
enum VehicleType           { MOTORBIKE  CAR  VAN  TRUCK }
enum PickupPhotoType       { PICKUP_BEFORE  PICKUP_AFTER  DAMAGE  DOCUMENT  PACKAGE_LABEL }
```

### Relation Map

```
User ─┬─< Order.createdBy
      ├─< AuditLog.user
      ├─< PickupStatusLog.byUser
      ├─< PickupPhoto.uploadedBy
      └─1:1 Driver

Customer 1─< Order

ShippingService 1─< Order
                1─< ServiceCostRate

Order 1─< Package
      1─< Payment
      1─< OrderExtraCost
      0..1—1 PickupRequest          (FK on PickupRequest.orderId @unique)

Driver 1─< PickupRequest             (driverId nullable until ASSIGNED)

PickupRequest 1─< PickupPhoto
              1─< PickupStatusLog

CostItem 1─< OrderExtraCost          (optional FK; snapshot fields cover delete)
```

### Critical Schema Snippets

**Generator + Datasource** (`prisma/schema.prisma` top):

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../app/generated/prisma"
  importFileExtension = "ts"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

(`url = env("DATABASE_URL")` is fine — `prisma.config.ts` also provides it; schema-level `env()` keeps `prisma format` happy.)

**Order** (the big one):

```prisma
model Order {
  id                          String              @id @default(cuid())
  code                        String              @unique               // EZW-YYMM-NNNN
  status                      OrderStatus         @default(DRAFT)

  customerId                  String
  customer                    Customer            @relation(fields: [customerId], references: [id], onDelete: Restrict)
  serviceId                   String
  service                     ShippingService     @relation(fields: [serviceId], references: [id], onDelete: Restrict)

  // Snapshots (frozen at order create)
  chargeableWeightKg          Decimal             @db.Decimal(8, 2)
  volumetricDivisor           Int                 @default(5000)
  baseRateSnapshotVnd         Int
  serviceCostRateIdSnapshot   String?

  // Money (VND, Int)
  baseCostVnd                 Int                 @default(0)
  extraCostTotalVnd           Int                 @default(0)
  totalFeeVnd                 Int                 @default(0)
  profitVnd                   Int                 @default(0)

  // Pickup
  pickupMethod                PickupMethod        @default(NONE)
  thirdPartyProvider          String?
  thirdPartyProviderUrl       String?
  pickupRequest               PickupRequest?

  // Children
  packages                    Package[]
  payments                    Payment[]
  extraCosts                  OrderExtraCost[]

  // Audit
  createdAt                   DateTime            @default(now())
  updatedAt                   DateTime            @updatedAt
  createdById                 String
  createdBy                   User                @relation("OrderCreatedBy", fields: [createdById], references: [id])
  deletedAt                   DateTime?

  notes                       String?

  @@index([customerId, createdAt])
  @@index([serviceId, status])
  @@index([status, createdAt])
  @@map("orders")
}
```

**Package**:

```prisma
model Package {
  id                  String   @id @default(cuid())
  orderId             String
  order               Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  trackingCode        String?
  description         String?
  actualWeightKg      Decimal  @db.Decimal(8, 2)
  lengthCm            Int
  widthCm             Int
  heightCm            Int
  volumetricWeightKg  Decimal  @db.Decimal(8, 2)
  chargeableWeightKg  Decimal  @db.Decimal(8, 2)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([orderId])
  @@map("packages")
}
```

**ShippingService**:

```prisma
model ShippingService {
  id                String                @id @default(cuid())
  code              String                @unique          // EZW-AIR-US-PRI
  name              String
  transportType     ShippingTransportType
  destinationCode   String                                 // "US", "CA", "EU"
  destinationName   String
  volumetricDivisor Int                   @default(5000)
  description       String?
  isActive          Boolean               @default(true)

  rates             ServiceCostRate[]
  orders            Order[]

  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  deletedAt         DateTime?

  @@map("shipping_services")
}
```

**ServiceCostRate** (tier table):

```prisma
model ServiceCostRate {
  id            String        @id @default(cuid())
  serviceId     String
  service       ShippingService @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  minWeightKg   Decimal       @db.Decimal(8, 2)
  maxWeightKg   Decimal       @db.Decimal(8, 2)
  rateType      CostRateType
  amountVnd     Int           // If FIXED_TOTAL: full price; if PER_KG: per-kg rate

  validFrom     DateTime      @default(now())
  validTo       DateTime?
  notes         String?

  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@unique([serviceId, minWeightKg, maxWeightKg, validFrom])
  @@index([serviceId, minWeightKg])
  @@index([serviceId, validFrom, validTo])
  @@map("service_cost_rates")
}
```

**CostItem** (catalog of extra costs):

```prisma
model CostItem {
  id            String           @id @default(cuid())
  code          String           @unique
  name          String
  category      CostCategory
  pricingType   CostPricingType
  defaultAmountVnd Int?                                   // null if QUOTE
  unitLabel     String?                                   // "lần", "kiện", "km"
  description   String?
  isActive      Boolean          @default(true)

  extraCosts    OrderExtraCost[]

  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  deletedAt     DateTime?

  @@map("cost_items")
}
```

**OrderExtraCost** (applied snapshot, immutable):

```prisma
model OrderExtraCost {
  id            String   @id @default(cuid())
  orderId       String
  order         Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  costItemId    String?
  costItem      CostItem? @relation(fields: [costItemId], references: [id], onDelete: SetNull)

  // Snapshot
  nameSnapshot      String
  categorySnapshot  CostCategory
  pricingSnapshot   CostPricingType
  quantity          Decimal  @db.Decimal(10, 2) @default(1)
  unitAmountVnd     Int
  amountVnd         Int                              // quantity * unitAmountVnd (denormalized)
  note              String?

  appliedAt     DateTime @default(now())

  @@index([orderId])
  @@map("order_extra_costs")
}
```

**PickupRequest** (the 1:1 optional with Order):

```prisma
model PickupRequest {
  id                String         @id @default(cuid())
  orderId           String         @unique
  order             Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)

  driverId          String?
  driver            Driver?        @relation(fields: [driverId], references: [id], onDelete: SetNull)

  currentStatus     PickupStatus   @default(PENDING)

  pickupAddress     String
  pickupContactName String
  pickupContactPhone String
  scheduledAt       DateTime?
  notes             String?

  photos            PickupPhoto[]
  statusLogs        PickupStatusLog[]

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@index([driverId, currentStatus])
  @@index([currentStatus, scheduledAt])
  @@map("pickup_requests")
}
```

**PickupStatusLog** (append-only):

```prisma
model PickupStatusLog {
  id                String         @id @default(cuid())
  pickupRequestId   String
  pickupRequest     PickupRequest  @relation(fields: [pickupRequestId], references: [id], onDelete: Cascade)
  fromStatus        PickupStatus?
  toStatus          PickupStatus
  byUserId          String
  byUser            User           @relation(fields: [byUserId], references: [id])
  note              String?
  at                DateTime       @default(now())

  @@index([pickupRequestId, at])
  @@map("pickup_status_logs")
}
```

**PickupPhoto**:

```prisma
model PickupPhoto {
  id                String           @id @default(cuid())
  pickupRequestId   String
  pickupRequest     PickupRequest    @relation(fields: [pickupRequestId], references: [id], onDelete: Cascade)
  photoUrl          String
  photoType         PickupPhotoType
  uploadedByUserId  String
  uploadedBy        User             @relation(fields: [uploadedByUserId], references: [id])
  uploadedAt        DateTime         @default(now())

  @@index([pickupRequestId, photoType])
  @@map("pickup_photos")
}
```

**Driver**:

```prisma
model Driver {
  id              String          @id @default(cuid())
  userId          String          @unique
  user            User            @relation(fields: [userId], references: [id])
  vehicleType     VehicleType
  vehiclePlate    String?
  phone           String
  isActive        Boolean         @default(true)

  pickupRequests  PickupRequest[]

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  deletedAt       DateTime?

  @@map("drivers")
}
```

**User, Customer, Payment, AuditLog**:

```prisma
model User {
  id            String      @id @default(cuid())
  email         String      @unique
  name          String
  role          UserRole    @default(STAFF)
  isActive      Boolean     @default(true)

  driver           Driver?
  ordersCreated    Order[]           @relation("OrderCreatedBy")
  auditLogs        AuditLog[]
  pickupStatusLogs PickupStatusLog[]
  pickupPhotos     PickupPhoto[]

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@map("users")
}

model Customer {
  id            String     @id @default(cuid())
  code          String     @unique
  name          String
  phone         String
  email         String?
  address       String
  isBusiness    Boolean    @default(false)
  taxCode       String?
  notes         String?

  orders        Order[]

  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  deletedAt     DateTime?

  @@index([phone])
  @@map("customers")
}

model Payment {
  id            String        @id @default(cuid())
  orderId       String
  order         Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  amountVnd     Int
  status        PaymentStatus @default(UNPAID)
  method        String?                                  // "BANK_TRANSFER", "CASH", "QR"
  reference     String?
  paidAt        DateTime?
  notes         String?

  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([orderId, status])
  @@map("payments")
}

model AuditLog {
  id            String   @id @default(cuid())
  userId        String?
  user          User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  entityType    String                                   // "Order", "PickupRequest"
  entityId      String
  action        String                                   // "CREATE", "UPDATE", "DELETE"
  beforeJson    Json?
  afterJson     Json?
  at            DateTime @default(now())

  @@index([entityType, entityId, at])
  @@index([userId, at])
  @@map("audit_logs")
}
```

## Related code files

- `prisma/schema.prisma` — REWRITE (current stub at lines 1-14)
- `app/generated/prisma/**` — auto-regenerated, gitignored
- `eslint.config.mjs` — already ignores `app/generated/**` (line 14), no change needed

## Implementation Steps

1. Open `prisma/schema.prisma`, replace contents with full schema (generator + datasource + 11 enums + 14 models, in this order).
2. Save. Run `npx prisma format` to normalize whitespace.
3. Run `npx prisma validate` to catch relation errors.
4. Run `npx prisma generate` to verify client compiles.
5. Inspect generated `app/generated/prisma/client.ts` exists.

## Todo list

- [ ] Add 11 enums at top of schema
- [ ] Add User model (no Driver back-relation yet — added in step below)
- [ ] Add Customer model
- [ ] Add ShippingService + ServiceCostRate
- [ ] Add CostItem
- [ ] Add Order with all snapshot fields + indexes
- [ ] Add Package with Cascade delete
- [ ] Add OrderExtraCost with snapshot fields
- [ ] Add Driver model
- [ ] Add PickupRequest (orderId @unique)
- [ ] Add PickupPhoto + PickupStatusLog
- [ ] Add Payment
- [ ] Add AuditLog (generic, no FK to entities)
- [ ] Wire all back-relations (User → Order, Driver, AuditLog, etc.)
- [ ] `npx prisma format` + `npx prisma validate`
- [ ] `npx prisma generate` succeeds
- [ ] Inspect generated client exports

## Success Criteria

- `npx prisma validate` returns "The schema at prisma/schema.prisma is valid"
- `npx prisma generate` exits 0
- `app/generated/prisma/client.ts` exists
- All 14 models + 11 enums present (grep check)

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Forgotten back-relation (Prisma errors out) | High | Use `prisma validate` after every model add |
| Decimal precision mismatch with helpers | Med | Use `@db.Decimal(8,2)` consistently; helpers cast to `number` once |
| Cascade rule too aggressive (deletes data) | Low | Customer/Service `onDelete: Restrict` (orders block delete); soft delete preferred |
| `prisma generate` slow on first run | Low | Acceptable, one-off |

## Security Considerations

- No PII encryption at rest yet — DB-level concern, deferred.
- `User.email` unique but no password column (auth deferred Phase 04+).
- `AuditLog.beforeJson`/`afterJson` may capture sensitive fields — Phase 03 should mask before write.
- No row-level security (RLS) in Postgres — all admin users see everything.

## Next steps

After this phase: [Phase 02 · Seed data](./phase-02-seed-data.md) populates the new tables.
