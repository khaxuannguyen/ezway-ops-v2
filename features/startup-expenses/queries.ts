import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PAGE_SIZE,
  buildPageMeta,
  type PageMeta,
} from "@/lib/pagination";
import type {
  ExpenseCategory,
  ExpenseStatus,
} from "@/app/generated/prisma/enums";

export interface ListStartupExpensesInput {
  q?: string;
  category?: ExpenseCategory;
  status?: ExpenseStatus;
  page?: number;
  pageSize?: number;
}

export interface StartupExpenseListRow {
  id: string;
  code: string;
  itemName: string;
  category: ExpenseCategory;
  amountVnd: number;
  status: ExpenseStatus;
  paymentDate: Date | null;
  paidBy: string | null;
}

export interface StartupExpenseListResult {
  rows: StartupExpenseListRow[];
  meta: PageMeta;
}

export async function listStartupExpenses(
  input: ListStartupExpensesInput = {}
): Promise<StartupExpenseListResult> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const q = (input.q ?? "").trim();

  const where = {
    deletedAt: null,
    ...(input.category ? { category: input.category } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" as const } },
            { itemName: { contains: q, mode: "insensitive" as const } },
            { paidBy: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.startupExpense.count({ where }),
    prisma.startupExpense.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    rows: rows.map((e) => ({
      id: e.id,
      code: e.code,
      itemName: e.itemName,
      category: e.category,
      amountVnd: e.amountVnd,
      status: e.status,
      paymentDate: e.paymentDate,
      paidBy: e.paidBy,
    })),
    meta: buildPageMeta(total, page, pageSize),
  };
}

export interface ExpenseCategoryTotal {
  category: ExpenseCategory;
  amountVnd: number;
  count: number;
}

export interface StartupExpenseSummary {
  grandTotalVnd: number;
  paidTotalVnd: number;
  unpaidTotalVnd: number;
  totalCount: number;
  byCategory: ExpenseCategoryTotal[];
}

export async function getStartupExpenseSummary(): Promise<StartupExpenseSummary> {
  const [byStatus, byCategory, all] = await Promise.all([
    prisma.startupExpense.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _sum: { amountVnd: true },
    }),
    prisma.startupExpense.groupBy({
      by: ["category"],
      where: { deletedAt: null },
      _sum: { amountVnd: true },
      _count: true,
    }),
    prisma.startupExpense.aggregate({
      where: { deletedAt: null },
      _sum: { amountVnd: true },
      _count: true,
    }),
  ]);

  const paid = byStatus.find((s) => s.status === "PAID");
  const unpaid = byStatus.find((s) => s.status === "UNPAID");

  return {
    grandTotalVnd: all._sum.amountVnd ?? 0,
    paidTotalVnd: paid?._sum.amountVnd ?? 0,
    unpaidTotalVnd: unpaid?._sum.amountVnd ?? 0,
    totalCount: all._count,
    byCategory: byCategory
      .map((c) => ({
        category: c.category,
        amountVnd: c._sum.amountVnd ?? 0,
        count: c._count,
      }))
      .sort((a, b) => b.amountVnd - a.amountVnd),
  };
}

export async function getStartupExpenseById(id: string) {
  const e = await prisma.startupExpense.findUnique({ where: { id } });
  if (!e || e.deletedAt) return null;
  return e;
}
