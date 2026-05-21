import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PAGE_SIZE,
  buildPageMeta,
  type PageMeta,
} from "@/lib/pagination";
import type {
  SupplyCategory,
  StockMovementType,
} from "@/app/generated/prisma/enums";

export interface ListSuppliesInput {
  q?: string;
  category?: SupplyCategory;
  page?: number;
  pageSize?: number;
}

export interface SupplyListRow {
  id: string;
  code: string;
  name: string;
  category: SupplyCategory;
  unit: string;
  currentStock: number;
  minStock: number;
  isLow: boolean;
  isActive: boolean;
}

export interface SupplyListResult {
  rows: SupplyListRow[];
  meta: PageMeta;
  lowStockCount: number;
}

export async function listSupplies(
  input: ListSuppliesInput = {}
): Promise<SupplyListResult> {
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
          ],
        }
      : {}),
  };

  const [total, rows, lowStockCount] = await Promise.all([
    prisma.supply.count({ where }),
    prisma.supply.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM supplies
      WHERE "deletedAt" IS NULL AND "currentStock" <= "minStock"
    `,
  ]);

  return {
    rows: rows.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      category: s.category,
      unit: s.unit,
      currentStock: s.currentStock,
      minStock: s.minStock,
      isLow: s.currentStock <= s.minStock,
      isActive: s.isActive,
    })),
    meta: buildPageMeta(total, page, pageSize),
    lowStockCount: Number(lowStockCount[0]?.count ?? 0),
  };
}

export interface SupplyMovementRow {
  id: string;
  type: StockMovementType;
  quantityDelta: number;
  stockAfter: number;
  note: string | null;
  createdAt: Date;
  createdByName: string;
  orderId: string | null;
  orderCode: string | null;
}

export async function listActiveSuppliesLite() {
  return prisma.supply.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, code: true, name: true, unit: true, currentStock: true },
    orderBy: { code: "asc" },
  });
}

export async function getSupplyById(id: string) {
  const s = await prisma.supply.findUnique({
    where: { id },
    include: {
      movements: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          createdBy: { select: { name: true } },
          order: { select: { id: true, code: true } },
        },
      },
    },
  });
  if (!s || s.deletedAt) return null;
  return {
    supply: {
      id: s.id,
      code: s.code,
      name: s.name,
      category: s.category,
      unit: s.unit,
      currentStock: s.currentStock,
      minStock: s.minStock,
      notes: s.notes,
      isActive: s.isActive,
      createdAt: s.createdAt,
    },
    movements: s.movements.map((m): SupplyMovementRow => ({
      id: m.id,
      type: m.type,
      quantityDelta: m.quantityDelta,
      stockAfter: m.stockAfter,
      note: m.note,
      createdAt: m.createdAt,
      createdByName: m.createdBy.name,
      orderId: m.order?.id ?? null,
      orderCode: m.order?.code ?? null,
    })),
  };
}
