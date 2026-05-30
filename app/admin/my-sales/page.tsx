import type { Metadata } from "next";
import { Banknote, ShoppingBag, TrendingUp, Trophy, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyDisplay } from "@/components/shared/money-display";
import { MonthFilter } from "@/features/sales/components/month-filter";
import {
  getSalesPersonSummary,
  getRevenueLeaderboard,
} from "@/features/sales/queries";
import { resolveMonth } from "@/features/sales/month";
import { formatCurrencyVND } from "@/lib/format";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Bán hàng của tôi",
};

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function MySalesPage({ searchParams }: PageProps) {
  const user = await requireUser();
  // Trang dành riêng cho SALE — non-SALE bookmark URL sẽ về dashboard chính.
  if (user.role !== "SALE") {
    redirect("/admin/dashboard");
  }

  const sp = await searchParams;
  const month = resolveMonth(sp.month);
  const [summary, leaderboard] = await Promise.all([
    getSalesPersonSummary(user.id, month.start, month.end),
    getRevenueLeaderboard(month.start, month.end),
  ]);

  const myRank = leaderboard.find((e) => e.userId === user.id);

  const monthDebt = summary.monthRevenueVnd - summary.monthCollectedVnd;
  const cards = [
    {
      label: "Báo giá",
      icon: Wallet,
      node: <MoneyDisplay value={summary.monthRevenueVnd} emphasis="strong" />,
    },
    {
      label: "Đã thu",
      icon: Banknote,
      node: (
        <MoneyDisplay
          value={summary.monthCollectedVnd}
          tone={summary.monthCollectedVnd > 0 ? "positive" : "default"}
          emphasis="strong"
        />
      ),
    },
    {
      label: "Công nợ",
      icon: ShoppingBag,
      node: (
        <MoneyDisplay
          value={monthDebt}
          tone={monthDebt > 0 ? "negative" : "positive"}
          emphasis="strong"
        />
      ),
    },
    {
      label: "Lợi nhuận",
      icon: TrendingUp,
      node: (
        <MoneyDisplay
          value={summary.monthProfitVnd}
          tone={summary.monthProfitVnd >= 0 ? "positive" : "negative"}
          emphasis="strong"
        />
      ),
    },
    {
      label: "Số đơn",
      icon: ShoppingBag,
      node: summary.monthOrderCount.toLocaleString("vi-VN"),
    },
    {
      label: "Thứ hạng",
      icon: Trophy,
      node: myRank ? "#" + myRank.rank + " / " + leaderboard.length : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Bán hàng của tôi"}
        description={"Doanh thu, lợi nhuận và thứ hạng của bạn — " + month.label + "."}
        actions={<MonthFilter value={month.key} label={month.label} />}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between border-b-0 pb-2">
                <CardDescription>{card.label}</CardDescription>
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {card.node}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader className="border-b-0 pb-2">
          <CardDescription>{"Luỹ kế từ trước đến nay"}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 sm:grid-cols-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{"Tổng đơn"}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {summary.allTimeOrderCount.toLocaleString("vi-VN")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{"Tổng báo giá"}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatCurrencyVND(summary.allTimeRevenueVnd)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{"Đã thu"}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-success">
              {formatCurrencyVND(summary.allTimeCollectedVnd)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{"Tổng lợi nhuận"}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatCurrencyVND(summary.allTimeProfitVnd)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            {"Bảng xếp hạng doanh thu — " + month.label}
          </h2>
          <p className="text-xs text-muted-foreground">
            {"Xếp hạng theo tổng doanh thu trong tháng."}
          </p>
        </div>
        {leaderboard.length === 0 ? (
          <div className="p-6">
            <EmptyState title={"Chưa có nhân viên sale nào."} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">{"#"}</TableHead>
                <TableHead>{"Nhân viên sale"}</TableHead>
                <TableHead className="text-right">{"Số đơn"}</TableHead>
                <TableHead className="text-right">{"Doanh thu"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry) => {
                const isMe = entry.userId === user.id;
                return (
                  <TableRow
                    key={entry.userId}
                    className={isMe ? "bg-primary/5" : undefined}
                  >
                    <TableCell className="tabular-nums text-muted-foreground">
                      {entry.rank}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{entry.name}</span>
                      {isMe ? (
                        <Badge tone="primary" className="ml-2">
                          {"Bạn"}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.orderCount.toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay value={entry.revenueVnd} emphasis="strong" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
