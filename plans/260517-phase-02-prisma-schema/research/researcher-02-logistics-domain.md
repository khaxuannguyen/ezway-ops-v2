# Logistics Domain Modeling Reference — Phase 02

**Date**: 2026-05-17  
**Scope**: Prisma schema design for EZWay Ops international shipping system  
**Research basis**: Shopify, Stripe, Shippo, DHL, IATA, industry SQL patterns

---

## 1. Price Snapshot Pattern (Immutable Line Items)

**Pattern**: Denormalize rate + cost at time of order creation. Never modify historical snapshots.

**Why**: Prevent retroactive price changes from altering order profitability. Stripe and Shopify both freeze prices on invoices/orders.

**Fields on Order/Package/OrderExtraCost**:
```prisma
Order {
  // Snapshots at order time (frozen)
  chargeableWeightKg        Float    // Computed: max(actual, volumetric)
  baseRateSnapshotVND       Int      // Locked rate for chosen service + weight tier
  serviceCostRateIdSnapshot Int?     // FK to ServiceCostRate used (audit trail)
  
  // All extra costs frozen at application time
  extraCostsSnapshot        Json?    // Denormalized array of {costId, amount, appliedAt}
}

OrderExtraCost {
  appliedAtVND              Int      // Amount frozen when applied (never changes)
  costItemIdSnapshot        Int?     // Which cost template (for audit)
  appliedAt                 DateTime // Immutable timestamp
}
```

**Index**: `Order(serviceId, chargeableWeightKg)` for future cost audits.

---

## 2. Tiered Rate Lookup (Weight-Based)

**Data model**: Store each tier as ServiceCostRate row with weight bounds + rate type.

```prisma
ServiceCostRate {
  id                Int
  serviceId         Int      // FK Service (e.g., EZW-AIR-US-PRI)
  minWeightKg       Float    // 0.5, 1.0, 1.5, ..., 20.5, then 21, 45, 100, ...
  maxWeightKg       Float
  rateType          Enum     // FIXED_TOTAL or PER_KG
  amountVND         Int      // Cost in VND
  validFrom         DateTime // Price validity (for historical tracking)
  validTo           DateTime?
  
  @@unique([serviceId, minWeightKg, maxWeightKg, validFrom])
  @@index([serviceId, minWeightKg])
}
```

**Query pattern**: For weight W and service S, find tier where `minWeightKg <= W <= maxWeightKg AND validFrom <= now AND validTo IS NULL`.

```sql
SELECT * FROM ServiceCostRate 
WHERE serviceId = ? 
  AND minWeightKg <= ? 
  AND maxWeightKg >= ?
  AND validFrom <= NOW()
  AND validTo IS NULL
LIMIT 1;
```

**Index strategy**: Composite `(serviceId, minWeightKg)` for range scans; `(serviceId, validFrom, validTo)` for temporal queries if needed.

---

## 3. Money in VND — Int vs BigInt

**Recommendation**: Use `Int` (signed 32-bit = ±2.1B) for individual orders/items; `BigInt` for cumulative ledgers.

**Rationale**:
- Single package: max 500kg × 1M VND/kg = 500M VND (safe on Int)
- Order total + surcharges: rarely exceeds 1B VND (safe on Int)
- Cumulative profit ledger (year of orders): can exceed 2.1B (needs BigInt)

```prisma
Order {
  baseCostVND               Int      // Individual order
  totalFeeVND               Int
  profitVND                 Int      // Computed, fits Int for single order
}

AuditLedger {
  cumulativeProfitVND       BigInt   // Yearly rollup
}
```

**Rule**: Avoid Float entirely (rounding errors). Assume VND has no fractional unit (1 VND minimum).

---

## 4. Volumetric Weight Formula & Rounding

**Standard formula**: `volumetric_kg = (L_cm × W_cm × H_cm) / 6000` (IATA, traditional air freight).

**Express couriers** (DHL, FedEx, UPS): Use `/5000` (results in higher chargeable weight).  
**Recommendation for EZW**: Support both via config, default to 5000 (more conservative for pricing accuracy).

**Rounding**: Round **up** to next weight tier (0.5, 1.0, 1.5, ..., 20.5, then 21, 45, 100, 300, 500+).

```prisma
Package {
  actualWeightKg            Float
  lengthCm                  Int
  widthCm                   Int
  heightCm                  Int
  volumetricDivisor         Int      // 5000 or 6000, set by service config
  volumetricWeightKg        Float    // (L×W×H) / volumetricDivisor
  chargeableWeightKg        Float    // max(actualWeightKg, volumetricWeightKg), rounded up to tier
}

Service {
  volumetricDivisor         Int      // 5000 (express) or 6000 (air) — drives calc
}
```

**Tier rounding logic**: Given weight W, find smallest tier min ≥ W.

---

## 5. Pickup Workflow — Status Enum + Status Log Table

**Rationale**: Enum for quick current state; append-only PickupStatusLog for audit trail (7-state machine).

```prisma
PickupRequest {
  id                Int
  orderId           Int      // FK
  driverId          Int?     // Nullable; assigned when ASSIGNED state reached
  currentStatus     Enum     // PENDING|ASSIGNED|ACCEPTED|ON_THE_WAY|ARRIVED|PICKED_UP|FAILED|CANCELLED
  createdAt         DateTime
  updatedAt         DateTime
  
  statusLogs        PickupStatusLog[]
  photos            PickupPhoto[]
}

PickupStatusLog {
  id                Int
  pickupRequestId   Int      // FK
  fromStatus        Enum     // Previous state
  toStatus          Enum     // New state
  byUserId          Int      // Who made the change
  note              String?  // Reason (e.g., "Driver unavailable")
  photoUrls         String[]?
  at                DateTime // Immutable timestamp
  
  @@index([pickupRequestId, at])
}
```

**Benefits**: Current state queryable instantly; full history immutable and auditable.

---

## 6. Driver-Pickup Relationship

**Model**: One driver handles one active pickup; pickupRequest.driverId nullable until ASSIGNED.

```prisma
Driver {
  id                Int
  userId            Int      // FK User (admin/staff assigned the driver role)
  vehicleType       Enum     // BIKE|VAN|TRUCK (on Driver, not pickup)
  currentStatus     Enum     // IDLE|ON_PICKUP|ON_DELIVERY|OFFLINE
  pickupRequests    PickupRequest[]
}

PickupRequest {
  driverId          Int?     // Nullable; populated on ASSIGNED
}

@@index([Driver][currentStatus])
```

---

## 7. Photo / Evidence Storage

**Pattern**: URL + type enum. Upload logic deferred to Phase 03+.

```prisma
PickupPhoto {
  id                Int
  pickupRequestId   Int      // FK
  photoUrl          String   // S3/GCS URL (or placeholder path for Phase 02)
  photoType         Enum     // PICKUP_BEFORE|PICKUP_AFTER|DAMAGE|DOCUMENT
  uploadedAt        DateTime
  uploadedByUserId  Int
}
```

**Phase 02 scope**: Store URLs as strings; no real upload logic. UI can pass placeholder or mock S3 paths.

---

## 8. Audit Log Pattern — Generic vs Per-Table

**Recommendation**: Single generic AuditLog table for Phase 02 (simpler, YAGNI).

```prisma
AuditLog {
  id                Int
  userId            Int      // Who made the change
  entityType        String   // "Order", "PickupRequest", "ServiceCostRate"
  entityId          Int      // ID of the entity changed
  action            String   // "CREATE", "UPDATE", "DELETE"
  beforeJson        Json?    // Old values (nullable on CREATE)
  afterJson         Json?    // New values
  at                DateTime
  
  @@index([entityType, entityId, at])
}
```

**Alternative for future**: Per-table triggers. Not needed for Phase 02.

---

## 9. Third-Party Pickup (Grab/Ahamove) Representation

**Recommendation**: **Skip PickupRequest for third-party; just OrderExtraCost + freeform field.**

**Rationale**: Third-party providers are not managed (no driver, no status tracking). Modeled as a cost, not a workflow.

```prisma
Order {
  pickupMethod              Enum     // NONE|EZWAY_PICKUP|CUSTOMER_DROP_OFF|THIRD_PARTY
  thirdPartyPickupProvider  String?  // "GRAB", "AHAMOVE", etc. (nullable if pickupMethod != THIRD_PARTY)
  thirdPartyProviderUrl     String?  // Booking link or reference (for audit)
}

// Instead of PickupRequest, record cost:
OrderExtraCost {
  costItemId        Int?     // References PICKUP cost template
  appliedAtVND      Int      // Grab/Ahamove quote frozen at time of order
  // ...
}
```

**Benefit**: No orphaned PickupRequest rows; audit trail still complete via OrderExtraCost + AuditLog.

---

## Unresolved Questions

1. **PickupPhoto real upload**: S3 bucket strategy, signed URLs, CDN caching — deferred to Phase 03.
2. **Cost forecasting**: Should ServiceCostRate support future-dated validFrom for planned price changes? (Likely yes, consider for schema.)
3. **Currency localization**: Is VND fixed, or support multi-currency Orders in future? (Assume VND-only Phase 02.)
4. **Profit calculation precision**: Should totalFeeVND include surcharge tax? Or is profitVND net-only? (Clarify with stakeholders.)

---

## Sources

- [Stripe: Products and Prices](https://docs.stripe.com/products-prices/how-products-and-prices-work)
- [IATA Volumetric Weight Calculation](https://www.volumetricweightcalculator.com/blog/IATA-Volumetric-Weight-Calculation-Air-Freight-Billing-Guide.html)
- [DHL: Calculating Chargeable Weights](https://www.dhl.com/us-en/home/global-forwarding/freight-forwarding-education-center/calculating-chargeable-weights.html)
- [Maersk: Air Cargo Chargeable Weight](https://www.maersk.com/logistics-explained/transportation-and-freight/2025/03/10/air-cargo-chargeable-weight)
- [ShipperHQ: Table Rates](https://docs.shipperhq.com/table-rates)
- [Shopify Engineering: Change Capture](https://shopify.engineering/capturing-every-change-shopify-sharded-monolith)
