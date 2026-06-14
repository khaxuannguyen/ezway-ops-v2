import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PAGE_SIZE,
  buildPageMeta,
  type PageMeta,
} from "@/lib/pagination";
import type { VehicleType } from "@/app/generated/prisma/enums";

export interface ListDriversInput {
  q?: string;
  vehicleType?: VehicleType;
  page?: number;
  pageSize?: number;
}

export interface DriverListRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: VehicleType;
  vehiclePlate: string | null;
  isActive: boolean;
  pickupCount: number;
  createdAt: Date;
}

export interface DriverListResult {
  rows: DriverListRow[];
  meta: PageMeta;
}

export async function listDrivers(
  input: ListDriversInput = {}
): Promise<DriverListResult> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const q = (input.q ?? "").trim();

  const where = {
    deletedAt: null,
    ...(input.vehicleType ? { vehicleType: input.vehicleType } : {}),
    ...(q
      ? {
          OR: [
            { phone: { contains: q } },
            { vehiclePlate: { contains: q, mode: "insensitive" as const } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.driver.count({ where }),
    prisma.driver.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { pickupRequests: true } },
      },
    }),
  ]);

  return {
    rows: rows.map((d) => ({
      id: d.id,
      name: d.user.name,
      email: d.user.email,
      phone: d.phone,
      vehicleType: d.vehicleType,
      vehiclePlate: d.vehiclePlate,
      isActive: d.isActive,
      pickupCount: d._count.pickupRequests,
      createdAt: d.createdAt,
    })),
    meta: buildPageMeta(total, page, pageSize),
  };
}

export interface DriverLiteOption {
  id: string;
  name: string;
  phone: string;
  vehiclePlate: string | null;
  vehicleType: VehicleType;
}

/** Dropdown gán tài xế trên pickup detail — chỉ driver active + không soft-delete. */
export async function listActiveDriversLite(): Promise<DriverLiteOption[]> {
  const rows = await prisma.driver.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      phone: true,
      vehiclePlate: true,
      vehicleType: true,
      user: { select: { name: true } },
    },
  });
  return rows.map((d) => ({
    id: d.id,
    name: d.user.name,
    phone: d.phone,
    vehiclePlate: d.vehiclePlate,
    vehicleType: d.vehicleType,
  }));
}

export async function getDriverById(id: string) {
  const d = await prisma.driver.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true } },
      _count: { select: { pickupRequests: true } },
    },
  });
  if (!d || d.deletedAt) return null;
  return d;
}
