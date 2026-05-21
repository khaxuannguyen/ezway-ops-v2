import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PAGE_SIZE,
  buildPageMeta,
  type PageMeta,
} from "@/lib/pagination";
import type { PickupStatus } from "@/app/generated/prisma/enums";

export interface ListPickupsInput {
  q?: string;
  status?: PickupStatus;
  driverId?: string;
  page?: number;
  pageSize?: number;
}

export interface PickupListRow {
  id: string;
  currentStatus: PickupStatus;
  pickupAddress: string;
  pickupContactName: string;
  pickupContactPhone: string;
  scheduledAt: Date | null;
  createdAt: Date;
  order: { id: string; code: string };
  customerName: string;
  driverName: string | null;
}

export interface PickupListResult {
  rows: PickupListRow[];
  meta: PageMeta;
}

export async function listPickups(
  input: ListPickupsInput = {}
): Promise<PickupListResult> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const q = (input.q ?? "").trim();

  const where = {
    ...(input.status ? { currentStatus: input.status } : {}),
    ...(input.driverId ? { driverId: input.driverId } : {}),
    ...(q
      ? {
          OR: [
            { pickupContactName: { contains: q, mode: "insensitive" as const } },
            { pickupContactPhone: { contains: q } },
            { pickupAddress: { contains: q, mode: "insensitive" as const } },
            { order: { code: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.pickupRequest.count({ where }),
    prisma.pickupRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        order: {
          select: {
            id: true,
            code: true,
            customer: { select: { name: true } },
          },
        },
        driver: { select: { user: { select: { name: true } } } },
      },
    }),
  ]);

  return {
    rows: rows.map((p) => ({
      id: p.id,
      currentStatus: p.currentStatus,
      pickupAddress: p.pickupAddress,
      pickupContactName: p.pickupContactName,
      pickupContactPhone: p.pickupContactPhone,
      scheduledAt: p.scheduledAt,
      createdAt: p.createdAt,
      order: { id: p.order.id, code: p.order.code },
      customerName: p.order.customer.name,
      driverName: p.driver?.user.name ?? null,
    })),
    meta: buildPageMeta(total, page, pageSize),
  };
}

export async function getPickupById(id: string) {
  return prisma.pickupRequest.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          id: true,
          code: true,
          status: true,
          customer: { select: { id: true, code: true, name: true } },
        },
      },
      driver: {
        select: {
          id: true,
          phone: true,
          user: { select: { name: true } },
        },
      },
    },
  });
}

export async function listOrdersWithoutPickup(includeOrderId?: string) {
  return prisma.order.findMany({
    where: {
      deletedAt: null,
      OR: [
        { pickupRequest: { is: null } },
        ...(includeOrderId ? [{ id: includeOrderId }] : []),
      ],
    },
    select: {
      id: true,
      code: true,
      customer: {
        select: { code: true, name: true, phone: true, address: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listDriversLiteForPickup() {
  return prisma.driver.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      phone: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
