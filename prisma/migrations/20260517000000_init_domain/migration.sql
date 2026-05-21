-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF', 'DRIVER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'PICKING_UP', 'AT_WAREHOUSE', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ShippingTransportType" AS ENUM ('AIR', 'SEA');

-- CreateEnum
CREATE TYPE "CostRateType" AS ENUM ('FIXED_TOTAL', 'PER_KG');

-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('PICKUP', 'PACKAGING', 'CUSTOMS_SURCHARGE', 'OPERATION', 'OTHER');

-- CreateEnum
CREATE TYPE "CostPricingType" AS ENUM ('PER_UNIT', 'PER_KG', 'PER_KM', 'FLAT_RATE', 'QUOTE');

-- CreateEnum
CREATE TYPE "PickupMethod" AS ENUM ('NONE', 'EZWAY_PICKUP', 'CUSTOMER_DROP_OFF', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "PickupStatus" AS ENUM ('PENDING', 'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'PICKED_UP', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('MOTORBIKE', 'CAR', 'VAN', 'TRUCK');

-- CreateEnum
CREATE TYPE "PickupPhotoType" AS ENUM ('PICKUP_BEFORE', 'PICKUP_AFTER', 'DAMAGE', 'DOCUMENT', 'PACKAGE_LABEL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "isBusiness" BOOLEAN NOT NULL DEFAULT false,
    "taxCode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_services" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "transportType" "ShippingTransportType" NOT NULL,
    "destinationCode" TEXT NOT NULL,
    "destinationName" TEXT NOT NULL,
    "volumetricDivisor" INTEGER NOT NULL DEFAULT 5000,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "shipping_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_cost_rates" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "minWeightKg" DECIMAL(8,2) NOT NULL,
    "maxWeightKg" DECIMAL(8,2) NOT NULL,
    "rateType" "CostRateType" NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_cost_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL,
    "pricingType" "CostPricingType" NOT NULL,
    "defaultAmountVnd" INTEGER,
    "unitLabel" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cost_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "chargeableWeightKg" DECIMAL(8,2) NOT NULL,
    "volumetricDivisor" INTEGER NOT NULL DEFAULT 5000,
    "baseRateSnapshotVnd" INTEGER NOT NULL,
    "serviceCostRateIdSnapshot" TEXT,
    "baseCostVnd" INTEGER NOT NULL DEFAULT 0,
    "extraCostTotalVnd" INTEGER NOT NULL DEFAULT 0,
    "totalFeeVnd" INTEGER NOT NULL DEFAULT 0,
    "profitVnd" INTEGER NOT NULL DEFAULT 0,
    "pickupMethod" "PickupMethod" NOT NULL DEFAULT 'NONE',
    "thirdPartyProvider" TEXT,
    "thirdPartyProviderUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "trackingCode" TEXT,
    "description" TEXT,
    "actualWeightKg" DECIMAL(8,2) NOT NULL,
    "lengthCm" INTEGER NOT NULL,
    "widthCm" INTEGER NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "volumetricWeightKg" DECIMAL(8,2) NOT NULL,
    "chargeableWeightKg" DECIMAL(8,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_extra_costs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "costItemId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "categorySnapshot" "CostCategory" NOT NULL,
    "pricingSnapshot" "CostPricingType" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unitAmountVnd" INTEGER NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "note" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_extra_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "vehiclePlate" TEXT,
    "phone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "driverId" TEXT,
    "currentStatus" "PickupStatus" NOT NULL DEFAULT 'PENDING',
    "pickupAddress" TEXT NOT NULL,
    "pickupContactName" TEXT NOT NULL,
    "pickupContactPhone" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickup_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_status_logs" (
    "id" TEXT NOT NULL,
    "pickupRequestId" TEXT NOT NULL,
    "fromStatus" "PickupStatus",
    "toStatus" "PickupStatus" NOT NULL,
    "byUserId" TEXT NOT NULL,
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_photos" (
    "id" TEXT NOT NULL,
    "pickupRequestId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "photoType" "PickupPhotoType" NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "method" TEXT,
    "reference" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_services_code_key" ON "shipping_services"("code");

-- CreateIndex
CREATE INDEX "service_cost_rates_serviceId_minWeightKg_idx" ON "service_cost_rates"("serviceId", "minWeightKg");

-- CreateIndex
CREATE INDEX "service_cost_rates_serviceId_validFrom_validTo_idx" ON "service_cost_rates"("serviceId", "validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "service_cost_rates_serviceId_minWeightKg_maxWeightKg_validF_key" ON "service_cost_rates"("serviceId", "minWeightKg", "maxWeightKg", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "cost_items_code_key" ON "cost_items"("code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_code_key" ON "orders"("code");

-- CreateIndex
CREATE INDEX "orders_customerId_createdAt_idx" ON "orders"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_serviceId_status_idx" ON "orders"("serviceId", "status");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "packages_orderId_idx" ON "packages"("orderId");

-- CreateIndex
CREATE INDEX "order_extra_costs_orderId_idx" ON "order_extra_costs"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "pickup_requests_orderId_key" ON "pickup_requests"("orderId");

-- CreateIndex
CREATE INDEX "pickup_requests_driverId_currentStatus_idx" ON "pickup_requests"("driverId", "currentStatus");

-- CreateIndex
CREATE INDEX "pickup_requests_currentStatus_scheduledAt_idx" ON "pickup_requests"("currentStatus", "scheduledAt");

-- CreateIndex
CREATE INDEX "pickup_status_logs_pickupRequestId_at_idx" ON "pickup_status_logs"("pickupRequestId", "at");

-- CreateIndex
CREATE INDEX "pickup_photos_pickupRequestId_photoType_idx" ON "pickup_photos"("pickupRequestId", "photoType");

-- CreateIndex
CREATE INDEX "payments_orderId_status_idx" ON "payments"("orderId", "status");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_at_idx" ON "audit_logs"("entityType", "entityId", "at");

-- CreateIndex
CREATE INDEX "audit_logs_userId_at_idx" ON "audit_logs"("userId", "at");

-- AddForeignKey
ALTER TABLE "service_cost_rates" ADD CONSTRAINT "service_cost_rates_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "shipping_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "shipping_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_extra_costs" ADD CONSTRAINT "order_extra_costs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_extra_costs" ADD CONSTRAINT "order_extra_costs_costItemId_fkey" FOREIGN KEY ("costItemId") REFERENCES "cost_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_status_logs" ADD CONSTRAINT "pickup_status_logs_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "pickup_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_status_logs" ADD CONSTRAINT "pickup_status_logs_byUserId_fkey" FOREIGN KEY ("byUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_photos" ADD CONSTRAINT "pickup_photos_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "pickup_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_photos" ADD CONSTRAINT "pickup_photos_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
