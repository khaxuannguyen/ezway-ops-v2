import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PAGE_SIZE,
  buildPageMeta,
  type PageMeta,
} from "@/lib/pagination";
import type {
  CostCategory,
  CostPricingType,
} from "@/app/generated/prisma/enums";

export interface ListCostItemsInput {
  q?: string;
  category?: CostCategory;
  page?: number;
  pageSize?: number;
}

export interface CostItemListRow {
  id: string;
  code: string;
  name: string;
  category: CostCategory;
  pricingType: CostPricingType;
  defaultAmountVnd: number | null;
  unitLabel: string | null;
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
}

export interface CostItemListResult {
  rows: CostItemListRow[];
  meta: PageMeta;
}

export async function listCostItems(
  input: ListCostItemsInput = {}
): Promise<CostItemListResult> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const q = (input.q ?? "").trim();

  const where = {
    deletedAt: null,
    ...(input.category ? { category: input.category } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.costItem.count({ where }),
    prisma.costItem.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { extraCosts: true } } },
    }),
  ]);

  return {
    rows: rows.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      category: c.category,
      pricingType: c.pricingType,
      defaultAmountVnd: c.defaultAmountVnd,
      unitLabel: c.unitLabel,
      isActive: c.isActive,
      usageCount: c._count.extraCosts,
      createdAt: c.createdAt,
    })),
    meta: buildPageMeta(total, page, pageSize),
  };
}

export async function getCostItemById(id: string) {
  const c = await prisma.costItem.findUnique({
    where: { id },
    include: { _count: { select: { extraCosts: true } } },
  });
  if (!c || c.deletedAt) return null;
  return c;
}

export async function listActiveCostItemsLite() {
  return prisma.costItem.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      pricingType: true,
      defaultAmountVnd: true,
      unitLabel: true,
    },
    orderBy: { code: "asc" },
  });
}
