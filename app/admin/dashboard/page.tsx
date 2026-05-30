import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Package, ShoppingBag, Truck, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyDisplay } from "@/components/shared/money-display";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { prisma } from "@/lib/prisma";
import { countOrdersForDate } from "@/features/orders/queries";
import { countProcessingPackages } from "@/features/pickups/queries";
import { getOpenDebtTotal } from "@/features/payments/queries";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Bảng điều khiển",
};

async function loadStats() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const [
    todayOrders,
    processingPackages,
    openPickups,
    activeCustomers,
    monthAgg,
    openDebt,
    recentOrders,
  ] = await Promise.all([
    countOrdersForDate(today),
    countProcessingPackages(),
    prisma.pickupRequest.count({
      where: {
        currentStatus: {
          in: ["PENDING", "ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED"],
        },
      },
    }),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.order.aggregate({
      _sum: { totalFeeVnd: true, paidVnd: true },
      where: {
        deletedAt: null,
        status: { not: "CANCELLED" },
        createdAt: { gte: monthStart, lt: monthEnd },
      },
    }),
    getOpenDebtTotal(),
    prisma.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        code: true,
        status: true,
        totalFeeVnd: true,
        createdAt: true,
        customer: { select: { id: true, code: true, name: true } },
      },
    }),
  ]);

  return {
    todayOrders,
    processingPackages,
    openPickups,
    activeCustomers,
    monthRevenue: monthAgg._sum.totalFeeVnd ?? 0,
    monthCollected: monthAgg._sum.paidVnd ?? 0,
    openDebtVnd: openDebt.debtVnd,
    openDebtOrderCount: openDebt.openOrderCount,
    recentOrders,
  };
}

export default async function DashboardPage() {
  // Nhân viên sale có bảng điều khiển riêng.
  const user = await requireUser();
  if (user.role === "SALE") redirect("/admin/my-sales");

  const stats = await loadStats();

  const summary = [
    {
      label: "Đơn hàng hôm nay",
      value: stats.todayOrders,
      icon: ShoppingBag,
      hint: "Tạo trong hôm nay",
    },
    {
      label: "Kiện hàng đang xử lý",
      value: stats.processingPackages,
      icon: Package,
      hint: "Tổng kiện từ các đơn chưa hoàn thành",
    },
    {
      label: "Lệnh lấy hàng đang mở",
      value: stats.openPickups,
      icon: Truck,
      hint: "Chưa hoàn thành/huỷ",
    },
    {
      label: "Khách hàng hoạt động",
      value: stats.activeCustomers,
      icon: Users,
      hint: "Có đơn trong 30 ngày qua",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Bảng điều khiển"}
        description={"Tổng quan vận hành — cập nhật theo thời gian thực."}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between border-b-0 pb-2">
                <CardDescription>{card.label}</CardDescription>
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {card.value.toLocaleString("vi-VN")}
                </p>
                <p className="text-xs text-muted-foreground">{card.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{"Doanh thu"}</CardTitle>
              <CardDescription>{"Tổng tiền đã thu từ đơn hàng đã hoàn tất."}</CardDescription>
            </div>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {"Xem tất cả"} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{"Báo giá tháng này"}</p>
                <p className="text-2xl font-semibold tabular-nums">
                  <MoneyDisplay value={stats.monthRevenue} emphasis="strong" />
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{"Đã thu tháng này"}</p>
                <p className="text-2xl font-semibold tabular-nums">
                  <MoneyDisplay
                    value={stats.monthCollected}
                    tone={stats.monthCollected > 0 ? "positive" : "default"}
                    emphasis="strong"
                  />
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {"Công nợ hiện tại"}
                  {stats.openDebtOrderCount > 0
                    ? ` (${stats.openDebtOrderCount.toLocaleString("vi-VN")} đơn)`
                    : ""}
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  <MoneyDisplay
                    value={stats.openDebtVnd}
                    tone={stats.openDebtVnd > 0 ? "negative" : "positive"}
                    emphasis="strong"
                  />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{"Đơn hàng gần đây"}</CardTitle>
            <CardDescription>{"Các phát sinh mới nhất từ gân đây."}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentOrders.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title={"Chưa có hoạt động"}
                  description={"Hoạt động vận hành sẽ xuất hiện sau khi có đơn hàng đầu tiên."}
                />
              </div>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {stats.recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-6 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {o.code}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.customer.code + " - " + o.customer.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(o.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <OrderStatusBadge status={o.status} />
                      <MoneyDisplay value={o.totalFeeVnd} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
