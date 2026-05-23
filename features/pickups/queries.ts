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
  /** Lọc theo người tạo (dùng cho góc nhìn SALE — chỉ lệnh do mình tạo). */
  createdById?: string;
  page?: number;
  pageSize?: number;
}

export interface PickupListRow {
  id: string;
  code: string;
  currentStatus: PickupStatus;
  pickupAddress: string;
  pickupContactName: string;
  pickupContactPhone: string;
  scheduledAt: Date | null;
  createdAt: Date;
  packageCount: number;
  order: { id: string; code: string } | null;
  driverName: string | null;
  createdByName: string;
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
    ...(input.createdById ? { createdById: input.createdById } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" as const } },
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
        order: { select: { id: true, code: true } },
        driver: { select: { user: { select: { name: true } } } },
        createdBy: { select: { name: true } },
        _count: { select: { packages: true } },
      },
    }),
  ]);

  return {
    rows: rows.map((p) => ({
      id: p.id,
      code: p.code,
      currentStatus: p.currentStatus,
      pickupAddress: p.pickupAddress,
      pickupContactName: p.pickupContactName,
      pickupContactPhone: p.pickupContactPhone,
      scheduledAt: p.scheduledAt,
      createdAt: p.createdAt,
      packageCount: p._count.packages,
      order: p.order,
      driverName: p.driver?.user.name ?? null,
      createdByName: p.createdBy.name,
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
      createdBy: { select: { id: true, name: true } },
      packages: { orderBy: { createdAt: "asc" } },
    },
  });
}

/** Số kiện hàng thuộc các đơn đang xử lý — dùng cho dashboard. */
export async function countProcessingPackages(): Promise<number> {
  return prisma.package.count({
    where: {
      pickupRequest: {
        order: {
          deletedAt: null,
          status: {
            in: [
              "PENDING",
              "CONFIRMED",
              "PICKING_UP",
              "AT_WAREHOUSE",
              "IN_TRANSIT",
            ],
          },
        },
      },
    },
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
