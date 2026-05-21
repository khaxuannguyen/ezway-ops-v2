import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PAGE_SIZE,
  buildPageMeta,
  type PageMeta,
} from "@/lib/pagination";
import type { ShippingTransportType } from "@/app/generated/prisma/enums";

export interface ListServicesInput {
  q?: string;
  transportType?: ShippingTransportType;
  page?: number;
  pageSize?: number;
}

export interface ServiceListRow {
  id: string;
  code: string;
  name: string;
  transportType: ShippingTransportType;
  destinationCode: string;
  destinationName: string;
  volumetricDivisor: number;
  isActive: boolean;
  rateCount: number;
  orderCount: number;
  createdAt: Date;
}

export interface ServiceListResult {
  rows: ServiceListRow[];
  meta: PageMeta;
}

export async function listServices(
  input: ListServicesInput = {}
): Promise<ServiceListResult> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const q = (input.q ?? "").trim();

  const where = {
    deletedAt: null,
    ...(input.transportType ? { transportType: input.transportType } : {}),
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

  const [total, rows] = await Promise.all([
    prisma.shippingService.count({ where }),
    prisma.shippingService.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { rates: true, orders: true } },
      },
    }),
  ]);

  return {
    rows: rows.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      transportType: s.transportType,
      destinationCode: s.destinationCode,
      destinationName: s.destinationName,
      volumetricDivisor: s.volumetricDivisor,
      isActive: s.isActive,
      rateCount: s._count.rates,
      orderCount: s._count.orders,
      createdAt: s.createdAt,
    })),
    meta: buildPageMeta(total, page, pageSize),
  };
}

export async function getServiceById(id: string) {
  const s = await prisma.shippingService.findUnique({
    where: { id },
    include: {
      rates: {
        orderBy: [{ validFrom: "desc" }, { minWeightKg: "asc" }],
        take: 200,
      },
      _count: { select: { rates: true, orders: true } },
    },
  });
  if (!s || s.deletedAt) return null;
  return s;
}
