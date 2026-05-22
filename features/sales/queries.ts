import { prisma } from "@/lib/prisma";

/** Điều kiện chung: đơn còn hiệu lực, không tính đơn đã huỷ. */
const liveOrder = { deletedAt: null, status: { not: "CANCELLED" as const } };

export interface SalesBreakdownRow {
  salesUserId: string | null;
  name: string;
  orderCount: number;
  revenueVnd: number;
  profitVnd: number;
}

export interface SalesBreakdown {
  rows: SalesBreakdownRow[];
  totalOrders: number;
  totalRevenueVnd: number;
  totalProfitVnd: number;
  /** Số nhân viên sale có ít nhất 1 đơn trong kỳ. */
  activeSalesCount: number;
}

/**
 * Thống kê doanh thu + lợi nhuận theo từng nhân viên sale trong 1 kỳ.
 * Dùng cho trang admin. Đơn chưa gán sale gom vào dòng "Chưa gán".
 */
export async function getSalesBreakdown(
  start: Date,
  end: Date
): Promise<SalesBreakdown> {
  const grouped = await prisma.order.groupBy({
    by: ["salesUserId"],
    where: { ...liveOrder, createdAt: { gte: start, lt: end } },
    _sum: { totalFeeVnd: true, profitVnd: true },
    _count: { _all: true },
  });

  const ids = grouped
    .map((g) => g.salesUserId)
    .filter((x): x is string => x !== null);
  const users = ids.length
    ? await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  const rows: SalesBreakdownRow[] = grouped
    .map((g) => ({
      salesUserId: g.salesUserId,
      name: g.salesUserId
        ? nameById.get(g.salesUserId) ?? "(không rõ)"
        : "Chưa gán",
      orderCount: g._count._all,
      revenueVnd: g._sum.totalFeeVnd ?? 0,
      profitVnd: g._sum.profitVnd ?? 0,
    }))
    .sort((a, b) => b.revenueVnd - a.revenueVnd);

  return {
    rows,
    totalOrders: rows.reduce((s, r) => s + r.orderCount, 0),
    totalRevenueVnd: rows.reduce((s, r) => s + r.revenueVnd, 0),
    totalProfitVnd: rows.reduce((s, r) => s + r.profitVnd, 0),
    activeSalesCount: rows.filter((r) => r.salesUserId !== null).length,
  };
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  orderCount: number;
  revenueVnd: number;
  rank: number;
}

/**
 * Bảng xếp hạng doanh thu theo nhân viên sale trong 1 kỳ.
 * Gồm mọi sale đang hoạt động (kể cả chưa có đơn) — KHÔNG kèm lợi nhuận.
 */
export async function getRevenueLeaderboard(
  start: Date,
  end: Date
): Promise<LeaderboardEntry[]> {
  const [salesUsers, grouped] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SALE", isActive: true },
      select: { id: true, name: true },
    }),
    prisma.order.groupBy({
      by: ["salesUserId"],
      where: {
        ...liveOrder,
        createdAt: { gte: start, lt: end },
        salesUserId: { not: null },
      },
      _sum: { totalFeeVnd: true },
      _count: { _all: true },
    }),
  ]);

  const statById = new Map(
    grouped.map((g) => [
      g.salesUserId as string,
      { revenue: g._sum.totalFeeVnd ?? 0, count: g._count._all },
    ])
  );

  return salesUsers
    .map((u) => ({
      userId: u.id,
      name: u.name,
      revenueVnd: statById.get(u.id)?.revenue ?? 0,
      orderCount: statById.get(u.id)?.count ?? 0,
    }))
    .sort((a, b) => b.revenueVnd - a.revenueVnd)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export interface SalesPersonSummary {
  monthOrderCount: number;
  monthRevenueVnd: number;
  monthProfitVnd: number;
  allTimeOrderCount: number;
  allTimeRevenueVnd: number;
  allTimeProfitVnd: number;
}

/** Tổng hợp doanh thu/lợi nhuận của 1 nhân viên sale (kỳ + luỹ kế). */
export async function getSalesPersonSummary(
  userId: string,
  start: Date,
  end: Date
): Promise<SalesPersonSummary> {
  const [month, all] = await Promise.all([
    prisma.order.aggregate({
      where: { ...liveOrder, salesUserId: userId, createdAt: { gte: start, lt: end } },
      _sum: { totalFeeVnd: true, profitVnd: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: { ...liveOrder, salesUserId: userId },
      _sum: { totalFeeVnd: true, profitVnd: true },
      _count: { _all: true },
    }),
  ]);

  return {
    monthOrderCount: month._count._all,
    monthRevenueVnd: month._sum.totalFeeVnd ?? 0,
    monthProfitVnd: month._sum.profitVnd ?? 0,
    allTimeOrderCount: all._count._all,
    allTimeRevenueVnd: all._sum.totalFeeVnd ?? 0,
    allTimeProfitVnd: all._sum.profitVnd ?? 0,
  };
}
