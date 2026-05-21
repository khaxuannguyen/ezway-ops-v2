import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PAGE_SIZE,
  buildPageMeta,
  type PageMeta,
} from "@/lib/pagination";

export interface ListPackagesInput {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface PackageListRow {
  id: string;
  trackingCode: string | null;
  description: string | null;
  actualWeightKg: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumetricWeightKg: string;
  chargeableWeightKg: string;
  createdAt: Date;
  order: { id: string; code: string };
}

export interface PackageListResult {
  rows: PackageListRow[];
  meta: PageMeta;
}

export async function listPackages(
  input: ListPackagesInput = {}
): Promise<PackageListResult> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const q = (input.q ?? "").trim();

  const where = q
    ? {
        OR: [
          { trackingCode: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
          {
            order: {
              code: { contains: q, mode: "insensitive" as const },
            },
          },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.package.count({ where }),
    prisma.package.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { order: { select: { id: true, code: true } } },
    }),
  ]);

  return {
    rows: rows.map((p) => ({
      id: p.id,
      trackingCode: p.trackingCode,
      description: p.description,
      actualWeightKg: p.actualWeightKg.toString(),
      lengthCm: p.lengthCm,
      widthCm: p.widthCm,
      heightCm: p.heightCm,
      volumetricWeightKg: p.volumetricWeightKg.toString(),
      chargeableWeightKg: p.chargeableWeightKg.toString(),
      createdAt: p.createdAt,
      order: p.order,
    })),
    meta: buildPageMeta(total, page, pageSize),
  };
}

export async function getPackageById(id: string) {
  const p = await prisma.package.findUnique({
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
    },
  });
  return p;
}

export async function listOrdersLiteForPicker() {
  return prisma.order.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      code: true,
      customer: { select: { code: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function countProcessingPackages(): Promise<number> {
  return prisma.package.count({
    where: {
      order: {
        deletedAt: null,
        status: {
          in: ["PENDING", "CONFIRMED", "PICKING_UP", "AT_WAREHOUSE", "IN_TRANSIT"],
        },
      },
    },
  });
}
