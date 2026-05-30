// EZWay Ops v2 — Phase 02 seed.
// Run via `npx prisma db seed` (configured in prisma.config.ts).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  UserRole,
  VehicleType,
  CostRateType,
  CostCategory,
  CostPricingType,
  PickupMethod,
  PickupStatus,
  PickupPhotoType,
  ShippingTransportType,
  OrderStatus,
} from "../app/generated/prisma/client";

import { priceOrder, type RateTier } from "../lib/domain";

const directUrl = process.env.DATABASE_URL;
if (!directUrl) {
  throw new Error(
    "Thiếu DATABASE_URL: cấu hình chuỗi kết nối Postgres trực tiếp trong .env trước khi chạy seed."
  );
}

const adapter = new PrismaPg({ connectionString: directUrl });
const prisma = new PrismaClient({ adapter });

type RateInput = {
  minWeightKg: number;
  maxWeightKg: number;
  rateType: CostRateType;
  amountVnd: number;
};

function fixedTotalForEU(halfStep: number): number {
  const w = halfStep / 2;
  if (Math.abs(w - 0.5) < 1e-9) return 350_000;
  return 250_000 + 300_000 * w;
}

function buildEuRates(): RateInput[] {
  const rates: RateInput[] = [];
  for (let i = 1; i <= 41; i++) {
    const w = i / 2;
    rates.push({
      minWeightKg: w,
      maxWeightKg: w,
      rateType: CostRateType.FIXED_TOTAL,
      amountVnd: fixedTotalForEU(i),
    });
  }
  rates.push({ minWeightKg: 21, maxWeightKg: 44, rateType: CostRateType.PER_KG, amountVnd: 295_000 });
  rates.push({ minWeightKg: 45, maxWeightKg: 99, rateType: CostRateType.PER_KG, amountVnd: 275_000 });
  rates.push({ minWeightKg: 100, maxWeightKg: 299, rateType: CostRateType.PER_KG, amountVnd: 255_000 });
  rates.push({ minWeightKg: 300, maxWeightKg: 499, rateType: CostRateType.PER_KG, amountVnd: 235_000 });
  rates.push({ minWeightKg: 500, maxWeightKg: 9999, rateType: CostRateType.PER_KG, amountVnd: 215_000 });
  return rates;
}

function buildAirUsPriRates(): RateInput[] {
  return [
    { minWeightKg: 0.5, maxWeightKg: 0.5, rateType: CostRateType.FIXED_TOTAL, amountVnd: 400_000 },
    { minWeightKg: 1.0, maxWeightKg: 1.0, rateType: CostRateType.FIXED_TOTAL, amountVnd: 620_000 },
    { minWeightKg: 2.0, maxWeightKg: 2.0, rateType: CostRateType.FIXED_TOTAL, amountVnd: 950_000 },
    { minWeightKg: 5.0, maxWeightKg: 5.0, rateType: CostRateType.FIXED_TOTAL, amountVnd: 1_950_000 },
    { minWeightKg: 7.0, maxWeightKg: 7.0, rateType: CostRateType.FIXED_TOTAL, amountVnd: 2_550_000 },
    { minWeightKg: 10.0, maxWeightKg: 10.0, rateType: CostRateType.FIXED_TOTAL, amountVnd: 3_500_000 },
    { minWeightKg: 11.0, maxWeightKg: 20.0, rateType: CostRateType.PER_KG, amountVnd: 320_000 },
    { minWeightKg: 21.0, maxWeightKg: 99.0, rateType: CostRateType.PER_KG, amountVnd: 295_000 },
    { minWeightKg: 100.0, maxWeightKg: 9999.0, rateType: CostRateType.PER_KG, amountVnd: 265_000 },
  ];
}

function buildAirUsEcoRates(): RateInput[] {
  return [
    { minWeightKg: 0.5, maxWeightKg: 0.5, rateType: CostRateType.FIXED_TOTAL, amountVnd: 280_000 },
    { minWeightKg: 1.0, maxWeightKg: 1.0, rateType: CostRateType.FIXED_TOTAL, amountVnd: 450_000 },
    { minWeightKg: 2.0, maxWeightKg: 2.0, rateType: CostRateType.FIXED_TOTAL, amountVnd: 720_000 },
    { minWeightKg: 5.0, maxWeightKg: 5.0, rateType: CostRateType.FIXED_TOTAL, amountVnd: 1_500_000 },
    { minWeightKg: 10.0, maxWeightKg: 10.0, rateType: CostRateType.FIXED_TOTAL, amountVnd: 2_700_000 },
    { minWeightKg: 11.0, maxWeightKg: 49.0, rateType: CostRateType.PER_KG, amountVnd: 245_000 },
    { minWeightKg: 50.0, maxWeightKg: 9999.0, rateType: CostRateType.PER_KG, amountVnd: 215_000 },
  ];
}

function buildSeaUsRates(): RateInput[] {
  return [
    { minWeightKg: 1.0, maxWeightKg: 49.0, rateType: CostRateType.PER_KG, amountVnd: 55_000 },
    { minWeightKg: 50.0, maxWeightKg: 99.0, rateType: CostRateType.PER_KG, amountVnd: 48_000 },
    { minWeightKg: 100.0, maxWeightKg: 299.0, rateType: CostRateType.PER_KG, amountVnd: 42_000 },
    { minWeightKg: 300.0, maxWeightKg: 499.0, rateType: CostRateType.PER_KG, amountVnd: 38_000 },
    { minWeightKg: 500.0, maxWeightKg: 9999.0, rateType: CostRateType.PER_KG, amountVnd: 32_000 },
  ];
}

function buildSeaCadRates(): RateInput[] {
  return [
    { minWeightKg: 1.0, maxWeightKg: 49.0, rateType: CostRateType.PER_KG, amountVnd: 65_000 },
    { minWeightKg: 50.0, maxWeightKg: 99.0, rateType: CostRateType.PER_KG, amountVnd: 56_000 },
    { minWeightKg: 100.0, maxWeightKg: 299.0, rateType: CostRateType.PER_KG, amountVnd: 49_000 },
    { minWeightKg: 300.0, maxWeightKg: 499.0, rateType: CostRateType.PER_KG, amountVnd: 44_000 },
    { minWeightKg: 500.0, maxWeightKg: 9999.0, rateType: CostRateType.PER_KG, amountVnd: 38_000 },
  ];
}

function volumetric(lengthCm: number, widthCm: number, heightCm: number, divisor: number): number {
  const raw = (lengthCm * widthCm * heightCm) / divisor;
  return Math.round(raw * 100) / 100;
}

type RateRow = {
  id: string;
  serviceId: string;
  minWeightKg: { toString: () => string } | string | number;
  maxWeightKg: { toString: () => string } | string | number;
  rateType: CostRateType;
  amountVnd: number;
};

function toRateTiers(rows: RateRow[]): RateTier[] {
  return rows.map((r) => ({
    id: r.id,
    minWeightKg: Number(r.minWeightKg),
    maxWeightKg: Number(r.maxWeightKg),
    rateType: r.rateType as RateTier["rateType"],
    amountVnd: r.amountVnd,
  }));
}

async function main() {
  await prisma.$transaction(
    async (tx) => {
      // 1. Users
      const admin = await tx.user.upsert({
        where: { email: "admin@ezway.local" },
        update: { name: "Quản trị viên", role: UserRole.ADMIN, isActive: true },
        create: { email: "admin@ezway.local", name: "Quản trị viên", role: UserRole.ADMIN },
      });
      const driverBikeUser = await tx.user.upsert({
        where: { email: "driver.bike@ezway.local" },
        update: { name: "Nguyễn Văn Bike", role: UserRole.DRIVER, isActive: true },
        create: { email: "driver.bike@ezway.local", name: "Nguyễn Văn Bike", role: UserRole.DRIVER },
      });
      const driverVanUser = await tx.user.upsert({
        where: { email: "driver.van@ezway.local" },
        update: { name: "Trần Thị Van", role: UserRole.DRIVER, isActive: true },
        create: { email: "driver.van@ezway.local", name: "Trần Thị Van", role: UserRole.DRIVER },
      });
      const driverTruckUser = await tx.user.upsert({
        where: { email: "driver.truck@ezway.local" },
        update: { name: "Lê Văn Truck", role: UserRole.DRIVER, isActive: true },
        create: { email: "driver.truck@ezway.local", name: "Lê Văn Truck", role: UserRole.DRIVER },
      });

      // 2. Drivers
      await tx.driver.upsert({
        where: { userId: driverBikeUser.id },
        update: { vehicleType: VehicleType.MOTORBIKE, vehiclePlate: "29-A1 12345", phone: "0901234567", isActive: true },
        create: { userId: driverBikeUser.id, vehicleType: VehicleType.MOTORBIKE, vehiclePlate: "29-A1 12345", phone: "0901234567" },
      });
      await tx.driver.upsert({
        where: { userId: driverVanUser.id },
        update: { vehicleType: VehicleType.VAN, vehiclePlate: "51C-678.90", phone: "0902345678", isActive: true },
        create: { userId: driverVanUser.id, vehicleType: VehicleType.VAN, vehiclePlate: "51C-678.90", phone: "0902345678" },
      });
      await tx.driver.upsert({
        where: { userId: driverTruckUser.id },
        update: { vehicleType: VehicleType.TRUCK, vehiclePlate: "50H-111.22", phone: "0903456789", isActive: true },
        create: { userId: driverTruckUser.id, vehicleType: VehicleType.TRUCK, vehiclePlate: "50H-111.22", phone: "0903456789" },
      });

      // 3. Customers
      const customersData = [
        { code: "CUS-0001", name: "Nguyễn Thị Hương", phone: "0911111111", isBusiness: false, address: "12 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM", taxCode: null as string | null },
        { code: "CUS-0002", name: "Trần Văn Minh", phone: "0922222222", isBusiness: false, address: "45 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM", taxCode: null },
        { code: "CUS-0003", name: "Phạm Thị Lan", phone: "0933333333", isBusiness: false, address: "78 Hai Bà Trưng, Hoàn Kiếm, Hà Nội", taxCode: null },
        { code: "CUS-0004", name: "Công ty TNHH Thương mại ABC", phone: "0944444444", isBusiness: true, address: "100 Điện Biên Phủ, Q.3, TP.HCM", taxCode: "0312345678" },
        { code: "CUS-0005", name: "Công ty CP XNK Phương Đông", phone: "0955555555", isBusiness: true, address: "Lô 5, KCN Tân Bình, TP.HCM", taxCode: "0398765432" },
      ];
      const customers: Record<string, { id: string }> = {};
      for (const c of customersData) {
        const row = await tx.customer.upsert({
          where: { code: c.code },
          update: { name: c.name, phone: c.phone, isBusiness: c.isBusiness, address: c.address, taxCode: c.taxCode },
          create: c,
        });
        customers[c.code] = { id: row.id };
      }

      // 4. Shipping Services
      const servicesData = [
        { code: "EZW-AIR-US-PRI", name: "EZWAY Air US Premium", transportType: ShippingTransportType.AIR, destinationCode: "US", destinationName: `Hoa Kỳ`, volumetricDivisor: 5000, description: "Dịch vụ hàng không, ưu tiên giao nhanh 5-7 ngày" },
        { code: "EZW-AIR-US-ECO", name: "EZWAY Air US Economy", transportType: ShippingTransportType.AIR, destinationCode: "US", destinationName: `Hoa Kỳ`, volumetricDivisor: 6000, description: "Dịch vụ hàng không Mỹ tiết kiệm, giao 10-14 ngày" },
        { code: "EZW-SEA-US", name: "EZWAY Sea US", transportType: ShippingTransportType.SEA, destinationCode: "US", destinationName: `Hoa Kỳ`, volumetricDivisor: 6000, description: "Dịch vụ đường biển Mỹ, giá rẻ giao 45-60 ngày" },
        { code: "EZW-SEA-CAD", name: "EZWAY Sea Canada", transportType: ShippingTransportType.SEA, destinationCode: "CA", destinationName: "Canada", volumetricDivisor: 6000, description: "Dịch vụ đường biển Canada, giao 50-65 ngày" },
        { code: "EZW-AIR-EU", name: "EZWAY Air Europe", transportType: ShippingTransportType.AIR, destinationCode: "EU", destinationName: "Châu Âu", volumetricDivisor: 5000, description: "Dịch vụ hàng không Châu Âu, bảng giá đầy đủ theo bậc cân" },
      ];
      const services: Record<string, { id: string }> = {};
      for (const s of servicesData) {
        const row = await tx.shippingService.upsert({
          where: { code: s.code },
          update: { name: s.name, transportType: s.transportType, destinationCode: s.destinationCode, destinationName: s.destinationName, volumetricDivisor: s.volumetricDivisor, description: s.description, isActive: true },
          create: s,
        });
        services[s.code] = { id: row.id };
      }

      // 5. Service Cost Rates
      const rateMap: Record<string, RateInput[]> = {
        "EZW-AIR-EU": buildEuRates(),
        "EZW-AIR-US-PRI": buildAirUsPriRates(),
        "EZW-AIR-US-ECO": buildAirUsEcoRates(),
        "EZW-SEA-US": buildSeaUsRates(),
        "EZW-SEA-CAD": buildSeaCadRates(),
      };
      for (const [code, rows] of Object.entries(rateMap)) {
        const serviceId = services[code].id;
        await tx.serviceCostRate.deleteMany({ where: { serviceId } });
        await tx.serviceCostRate.createMany({ data: rows.map((r) => ({ ...r, serviceId })) });
      }

      // 6. Cost Items
      const costItemsData = [
        { code: "PICKUP-CITY-50", name: "Pickup nội thành dưới 50kg", category: CostCategory.PICKUP, pricingType: CostPricingType.FLAT_RATE, defaultAmountVnd: 100_000 as number | null, unitLabel: "lần" },
        { code: "PICKUP-CITY-100", name: "Pickup nội thành 50-100kg", category: CostCategory.PICKUP, pricingType: CostPricingType.FLAT_RATE, defaultAmountVnd: 150_000, unitLabel: "lần" },
        { code: "PICKUP-CITY-300", name: "Pickup nội thành 100-300kg", category: CostCategory.PICKUP, pricingType: CostPricingType.FLAT_RATE, defaultAmountVnd: 200_000, unitLabel: "lần" },
        { code: "PICKUP-CITY-300P", name: "Pickup nội thành từ 300kg trở lên", category: CostCategory.PICKUP, pricingType: CostPricingType.FLAT_RATE, defaultAmountVnd: 300_000, unitLabel: "lần" },
        { code: "PICKUP-SUB-BASE", name: "Pickup ngoại thành phí cơ bản (<=20km)", category: CostCategory.PICKUP, pricingType: CostPricingType.FLAT_RATE, defaultAmountVnd: 300_000, unitLabel: "điểm" },
        { code: "PICKUP-SUB-KM", name: "Pickup ngoại thành phụ phí từ km thứ 21", category: CostCategory.PICKUP, pricingType: CostPricingType.PER_KM, defaultAmountVnd: 15_000, unitLabel: "km" },
        { code: "PACK-CARTON-STD", name: "Thùng carton tiêu chuẩn", category: CostCategory.PACKAGING, pricingType: CostPricingType.PER_UNIT, defaultAmountVnd: 30_000, unitLabel: "kiện" },
        { code: "PACK-FOAM-S", name: `Thùng xốp nhỏ`, category: CostCategory.PACKAGING, pricingType: CostPricingType.PER_UNIT, defaultAmountVnd: 60_000, unitLabel: "kiện" },
        { code: "PACK-FOAM-L", name: `Thùng xốp lớn`, category: CostCategory.PACKAGING, pricingType: CostPricingType.PER_UNIT, defaultAmountVnd: 80_000, unitLabel: "kiện" },
        { code: "PACK-THERM-S", name: `Túi giữ nhiệt nhỏ`, category: CostCategory.PACKAGING, pricingType: CostPricingType.PER_UNIT, defaultAmountVnd: 110_000, unitLabel: "kiện" },
        { code: "PACK-THERM-L", name: `Túi giữ nhiệt lớn`, category: CostCategory.PACKAGING, pricingType: CostPricingType.PER_UNIT, defaultAmountVnd: 150_000, unitLabel: "kiện" },
        { code: "PACK-WOOD-CRATE", name: `Kiện gỗ đóng hàng`, category: CostCategory.PACKAGING, pricingType: CostPricingType.QUOTE, defaultAmountVnd: null, unitLabel: "kiện" },
        { code: "CUS-FOOD", name: `Phụ phí hải quan hàng thịt/trứng/sữa`, category: CostCategory.CUSTOMS_SURCHARGE, pricingType: CostPricingType.QUOTE, defaultAmountVnd: null, unitLabel: "lần" },
        { code: "CUS-DANGER", name: `Phụ phí hàng pin/sơn gel/hóa chất`, category: CostCategory.CUSTOMS_SURCHARGE, pricingType: CostPricingType.QUOTE, defaultAmountVnd: null, unitLabel: "lần" },
        { code: "OPS-OVERHEAD", name: "Chi phí vận hành", category: CostCategory.OPERATION, pricingType: CostPricingType.FLAT_RATE, defaultAmountVnd: 50_000, unitLabel: "đơn" },
      ];
      const costItems: Record<string, { id: string; name: string; category: CostCategory; pricingType: CostPricingType }> = {};
      for (const item of costItemsData) {
        const row = await tx.costItem.upsert({
          where: { code: item.code },
          update: { name: item.name, category: item.category, pricingType: item.pricingType, defaultAmountVnd: item.defaultAmountVnd, unitLabel: item.unitLabel, isActive: true },
          create: item,
        });
        costItems[item.code] = { id: row.id, name: row.name, category: row.category, pricingType: row.pricingType };
      }

      // 7. Load fresh rate rows for pricing
      const allRates = await tx.serviceCostRate.findMany();
      const ratesByService: Record<string, RateTier[]> = {};
      for (const [code, sv] of Object.entries(services)) {
        ratesByService[code] = toRateTiers(allRates.filter((r) => r.serviceId === sv.id));
      }
      // 8. Sample Orders (one per PickupMethod) + Package + extras + payment
      type OrderSpec = {
        code: string;
        customerCode: string;
        serviceCode: string;
        pickupMethod: PickupMethod;
        thirdPartyProvider?: string | null;
        thirdPartyProviderUrl?: string | null;
        pkg: { actualWeightKg: number; lengthCm: number; widthCm: number; heightCm: number; description: string };
        chargeableKg: number;
        extras: { costItemCode: string; quantity: number; unitAmountVnd: number; note?: string }[];
        markupVnd: number;
        notes?: string;
      };

      const orderSpecs: OrderSpec[] = [
        {
          code: "EZW-2605-0001", customerCode: "CUS-0001", serviceCode: "EZW-AIR-EU",
          pickupMethod: PickupMethod.EZWAY_PICKUP,
          pkg: { actualWeightKg: 3.2, lengthCm: 30, widthCm: 25, heightCm: 20, description: `Quần áo và mỹ phẩm` },
          chargeableKg: 3.5,
          extras: [
            { costItemCode: "PACK-CARTON-STD", quantity: 1, unitAmountVnd: 30_000, note: "Thùng carton chuẩn" },
            { costItemCode: "OPS-OVERHEAD", quantity: 1, unitAmountVnd: 50_000 },
          ],
          markupVnd: 250_000,
          notes: "Đơn hàng đi EU, có pickup tận nơi.",
        },
        {
          code: "EZW-2605-0002", customerCode: "CUS-0002", serviceCode: "EZW-AIR-US-PRI",
          pickupMethod: PickupMethod.CUSTOMER_DROP_OFF,
          pkg: { actualWeightKg: 6.8, lengthCm: 40, widthCm: 30, heightCm: 25, description: `Hàng cá nhân, thực phẩm khô` },
          chargeableKg: 7.0,
          extras: [
            { costItemCode: "PACK-FOAM-L", quantity: 1, unitAmountVnd: 80_000, note: `Thùng xốp lớn` },
            { costItemCode: "OPS-OVERHEAD", quantity: 1, unitAmountVnd: 50_000 },
          ],
          markupVnd: 400_000,
          notes: "Khách tự mang đến kho.",
        },
        {
          code: "EZW-2605-0003", customerCode: "CUS-0004", serviceCode: "EZW-SEA-US",
          pickupMethod: PickupMethod.THIRD_PARTY,
          thirdPartyProvider: "GRAB",
          thirdPartyProviderUrl: "https://grab.example/track/2605-0003",
          pkg: { actualWeightKg: 118, lengthCm: 100, widthCm: 80, heightCm: 75, description: `Hàng doanh nghiệp, phụ kiện` },
          chargeableKg: 120,
          extras: [
            { costItemCode: "PICKUP-CITY-300", quantity: 1, unitAmountVnd: 200_000, note: `Pickup qua Grab, quy đổi theo bảng giá nội thành` },
            { costItemCode: "PACK-CARTON-STD", quantity: 6, unitAmountVnd: 30_000 },
            { costItemCode: "OPS-OVERHEAD", quantity: 1, unitAmountVnd: 50_000 },
          ],
          markupVnd: 800_000,
          notes: "Pickup do bên thứ ba (Grab) thực hiện.",
        },
        {
          code: "EZW-2605-0004", customerCode: "CUS-0005", serviceCode: "EZW-AIR-US-ECO",
          pickupMethod: PickupMethod.NONE,
          pkg: { actualWeightKg: 1.8, lengthCm: 25, widthCm: 20, heightCm: 15, description: "Mẫu sản phẩm B2B" },
          chargeableKg: 2.0,
          extras: [
            { costItemCode: "PACK-CARTON-STD", quantity: 1, unitAmountVnd: 30_000 },
            { costItemCode: "OPS-OVERHEAD", quantity: 1, unitAmountVnd: 50_000 },
          ],
          markupVnd: 200_000,
          notes: "Không có pickup, khách giao thẳng kho.",
        },
      ];

      let pickupSeq = 1;
      for (const spec of orderSpecs) {
        const service = services[spec.serviceCode];
        const customer = customers[spec.customerCode];
        const customerInfo = customersData.find(
          (c) => c.code === spec.customerCode
        )!;
        const tiers = ratesByService[spec.serviceCode];
        const { tier, baseCostVnd } = priceOrder(spec.chargeableKg, tiers);
        const extraTotal = spec.extras.reduce((s, e) => s + Math.round(e.quantity * e.unitAmountVnd), 0);
        const totalFeeVnd = baseCostVnd + extraTotal + spec.markupVnd;
        const profitVnd = totalFeeVnd - baseCostVnd - extraTotal;

        // Reset dữ liệu seed cũ của đơn này (xoá pickup sẽ cascade xoá kiện hàng).
        const existing = await tx.order.findUnique({
          where: { code: spec.code },
          select: { id: true },
        });
        if (existing) {
          await tx.orderExtraCost.deleteMany({ where: { orderId: existing.id } });
          await tx.payment.deleteMany({ where: { orderId: existing.id } });
          await tx.pickupRequest.deleteMany({ where: { orderId: existing.id } });
          await tx.order.delete({ where: { id: existing.id } });
        }

        // Lệnh lấy hàng tạo trước — mang kiện hàng.
        const volKg = volumetric(spec.pkg.lengthCm, spec.pkg.widthCm, spec.pkg.heightCm, 5000);
        const pickup = await tx.pickupRequest.create({
          data: {
            code: "PK-SEED-" + String(pickupSeq++).padStart(4, "0"),
            createdById: admin.id,
            currentStatus: PickupStatus.PENDING,
            pickupAddress: customerInfo.address,
            pickupContactName: customerInfo.name,
            pickupContactPhone: customerInfo.phone,
            scheduledAt: new Date("2026-05-20T09:00:00+07:00"),
            notes: "Lệnh lấy hàng mẫu (seed).",
            packages: {
              create: [
                {
                  description: spec.pkg.description,
                  actualWeightKg: spec.pkg.actualWeightKg,
                  lengthCm: spec.pkg.lengthCm,
                  widthCm: spec.pkg.widthCm,
                  heightCm: spec.pkg.heightCm,
                  volumetricWeightKg: volKg,
                  chargeableWeightKg: spec.chargeableKg,
                },
              ],
            },
          },
        });

        const order = await tx.order.create({
          data: {
            code: spec.code,
            status: OrderStatus.PENDING,
            customerId: customer.id,
            serviceId: service.id,
            chargeableWeightKg: spec.chargeableKg,
            volumetricDivisor: 5000,
            baseRateSnapshotVnd: tier.amountVnd,
            serviceCostRateIdSnapshot: tier.id,
            baseCostVnd, extraCostTotalVnd: extraTotal, totalFeeVnd, profitVnd,
            pickupMethod: spec.pickupMethod,
            thirdPartyProvider: spec.thirdPartyProvider ?? null,
            thirdPartyProviderUrl: spec.thirdPartyProviderUrl ?? null,
            createdById: admin.id,
            notes: spec.notes,
          },
        });

        // Gắn lệnh lấy hàng vào đơn.
        await tx.pickupRequest.update({
          where: { id: pickup.id },
          data: { orderId: order.id },
        });

        for (const e of spec.extras) {
          const ci = costItems[e.costItemCode];
          await tx.orderExtraCost.create({
            data: {
              orderId: order.id,
              costItemId: ci.id,
              nameSnapshot: ci.name,
              categorySnapshot: ci.category,
              pricingSnapshot: ci.pricingType,
              quantity: e.quantity,
              unitAmountVnd: e.unitAmountVnd,
              amountVnd: Math.round(e.quantity * e.unitAmountVnd),
              note: e.note,
            },
          });
        }

        // Đơn seed mặc định chưa có payment — paymentStatus tự là UNPAID.
        // Khi cần demo "đã thu", admin ghi nhận tay ở /admin/orders/[id].

        // Lịch sử + ảnh cho lệnh lấy hàng đầu tiên.
        if (spec.code === "EZW-2605-0001") {
          await tx.pickupStatusLog.create({
            data: {
              pickupRequestId: pickup.id,
              fromStatus: null,
              toStatus: PickupStatus.PENDING,
              byUserId: admin.id,
              note: "Tạo yêu cầu pickup",
            },
          });
          await tx.pickupPhoto.create({
            data: {
              pickupRequestId: pickup.id,
              photoUrl: "https://placeholder.ezway.local/pickup-before-1.jpg",
              photoType: PickupPhotoType.PICKUP_BEFORE,
              uploadedByUserId: admin.id,
            },
          });
        }
      }

      // 10. Summary
      const counts = {
        users: await tx.user.count(),
        drivers: await tx.driver.count(),
        customers: await tx.customer.count(),
        services: await tx.shippingService.count(),
        rates: await tx.serviceCostRate.count(),
        costItems: await tx.costItem.count(),
        orders: await tx.order.count(),
        pickups: await tx.pickupRequest.count(),
      };
      console.log(
        `Seeded: ${counts.users} users, ${counts.drivers} drivers, ${counts.customers} customers, ` +
          `${counts.services} services, ${counts.rates} rates, ${counts.costItems} cost items, ` +
          `${counts.orders} orders, ${counts.pickups} pickup`,
      );
    },
    { timeout: 30_000 },
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
