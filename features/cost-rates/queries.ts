import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PAGE_SIZE,
  buildPageMeta,
  type PageMeta,
} from "@/lib/pagination";
import type {
  CostRateType,
  ShippingTransportType,
} from "@/app/generated/prisma/enums";

// ── Grouped list: one row per service ──────────────────────────────────────

export interface ListCostRateServicesInput {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface CostRateServiceRow {
  id: string;
  code: string;
  name: string;
  transportType: ShippingTransportType;
  destinationCode: string;
  destinationName: string;
  isActive: boolean;
  rateCount: number;
  earliestValidFrom: Date | null;
  lastUpdatedAt: Date | null;
}

export interface CostRateServiceListResult {
  rows: CostRateServiceRow[];
  meta: PageMeta;
}

export async function listCostRateServices(
  input: ListCostRateServicesInput = {}
): Promise<CostRateServiceListResult> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const q = (input.q ?? "").trim();

  const where = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { destinationCode: { contains: q, mode: "insensitive" as const } },
            { destinationName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, services] = await Promise.all([
    prisma.shippingService.count({ where }),
    prisma.shippingService.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { rates: true } } },
    }),
  ]);

  const serviceIds = services.map((s) => s.id);
  const aggs =
    serviceIds.length > 0
      ? await prisma.serviceCostRate.groupBy({
          by: ["serviceId"],
          where: { serviceId: { in: serviceIds } },
          _min: { validFrom: true },
          _max: { updatedAt: true },
        })
      : [];

  const aggByService = new Map(aggs.map((a) => [a.serviceId, a]));

  return {
    rows: services.map((s) => {
      const agg = aggByService.get(s.id);
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        transportType: s.transportType,
        destinationCode: s.destinationCode,
        destinationName: s.destinationName,
        isActive: s.isActive,
        rateCount: s._count.rates,
        earliestValidFrom: agg?._min.validFrom ?? null,
        lastUpdatedAt: agg?._max.updatedAt ?? null,
      };
    }),
    meta: buildPageMeta(total, page, pageSize),
  };
}

// ── Full price table for one service ───────────────────────────────────────

export interface CostTableRate {
  id: string;
  minWeightKg: string;
  maxWeightKg: string;
  rateType: CostRateType;
  amountVnd: number;
  validFrom: Date;
  validTo: Date | null;
  notes: string | null;
}

export async function getServiceCostTable(serviceId: string) {
  const service = await prisma.shippingService.findUnique({
    where: { id: serviceId },
  });
  if (!service || service.deletedAt) return null;

  const rates = await prisma.serviceCostRate.findMany({
    where: { serviceId },
    orderBy: [{ minWeightKg: "asc" }, { validFrom: "desc" }],
  });

  const toRow = (r: (typeof rates)[number]): CostTableRate => ({
    id: r.id,
    minWeightKg: r.minWeightKg.toString(),
    maxWeightKg: r.maxWeightKg.toString(),
    rateType: r.rateType,
    amountVnd: r.amountVnd,
    validFrom: r.validFrom,
    validTo: r.validTo,
    notes: r.notes,
  });

  return {
    service,
    fixedRates: rates.filter((r) => r.rateType === "FIXED_TOTAL").map(toRow),
    perKgRates: rates.filter((r) => r.rateType === "PER_KG").map(toRow),
    rateCount: rates.length,
  };
}

// ── Single rate (for the rate-level edit page) ─────────────────────────────

export async function getCostRateById(id: string) {
  return prisma.serviceCostRate.findUnique({
    where: { id },
    include: {
      service: {
        select: {
          id: true,
          code: true,
          name: true,
          transportType: true,
          destinationName: true,
        },
      },
    },
  });
}

export async function listServicesLiteForCostRate() {
  return prisma.shippingService.findMany({
    where: { deletedAt: null },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
}
