import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PAGE_SIZE,
  buildPageMeta,
  type PageMeta,
} from "@/lib/pagination";
import type { OrderStatus } from "@/app/generated/prisma/enums";

export interface ListOrdersInput {
  q?: string;
  status?: OrderStatus;
  salesUserId?: string;
  page?: number;
  pageSize?: number;
}

export interface OrderListRow {
  id: string;
  code: string;
  status: OrderStatus;
  totalFeeVnd: number;
  baseCostVnd: number;
  extraCostTotalVnd: number;
  profitVnd: number;
  chargeableWeightKg: string;
  createdAt: Date;
  customer: { id: string; code: string; name: string };
  service: { id: string; code: string; name: string };
  salesUser: { id: string; name: string } | null;
  packageCount: number;
}

export interface OrderListResult {
  rows: OrderListRow[];
  meta: PageMeta;
}

export async function listOrders(
  input: ListOrdersInput = {}
): Promise<OrderListResult> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const q = (input.q ?? "").trim();

  const where = {
    deletedAt: null,
    ...(input.status ? { status: input.status } : {}),
    ...(input.salesUserId ? { salesUserId: input.salesUserId } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" as const } },
            {
              customer: {
                OR: [
                  { code: { contains: q, mode: "insensitive" as const } },
                  { name: { contains: q, mode: "insensitive" as const } },
                  { phone: { contains: q } },
                ],
              },
            },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, code: true, name: true } },
        service: { select: { id: true, code: true, name: true } },
        salesUser: { select: { id: true, name: true } },
        _count: { select: { packages: true } },
      },
    }),
  ]);

  return {
    rows: rows.map((o) => ({
      id: o.id,
      code: o.code,
      status: o.status,
      totalFeeVnd: o.totalFeeVnd,
      baseCostVnd: o.baseCostVnd,
      extraCostTotalVnd: o.extraCostTotalVnd,
      profitVnd: o.profitVnd,
      chargeableWeightKg: o.chargeableWeightKg.toString(),
      createdAt: o.createdAt,
      customer: o.customer,
      service: o.service,
      salesUser: o.salesUser,
      packageCount: o._count.packages,
    })),
    meta: buildPageMeta(total, page, pageSize),
  };
}

export async function getOrderById(id: string) {
  const o = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      service: true,
      packages: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      extraCosts: { orderBy: { appliedAt: "desc" } },
      createdBy: { select: { id: true, name: true, email: true } },
      salesUser: { select: { id: true, name: true } },
      pickupRequest: {
        select: {
          id: true,
          currentStatus: true,
          driver: { select: { user: { select: { name: true } } } },
        },
      },
      stockMovements: {
        orderBy: { createdAt: "asc" },
        include: {
          supply: { select: { id: true, code: true, name: true, unit: true } },
        },
      },
    },
  });
  if (!o || o.deletedAt) return null;
  return o;
}

export async function getServiceRateTiers(serviceId: string) {
  return prisma.serviceCostRate.findMany({
    where: { serviceId },
    orderBy: { minWeightKg: "asc" },
  });
}

export async function listAllServicesLite() {
  return prisma.shippingService.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      transportType: true,
      destinationCode: true,
      destinationName: true,
      volumetricDivisor: true,
    },
    orderBy: { code: "asc" },
  });
}

export async function countOrdersForDate(date: Date): Promise<number> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return prisma.order.count({
    where: { createdAt: { gte: start, lt: end } },
  });
}
