import type { Metadata } from "next";
import { ShoppingBag, TrendingUp, Users, Wallet } from "lucide-react";
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
import { getSalesBreakdown } from "@/features/sales/queries";
import { resolveMonth } from "@/features/sales/month";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Thống kê sale",
};

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

function marginLabel(revenueVnd: number, profitVnd: number): string {
  if (revenueVnd <= 0) return "—";
  return ((profitVnd / revenueVnd) * 100).toFixed(1) + "%";
}

export default async function SalesStatsPage({ searchParams }: PageProps) {
  await requireRole("ADMIN");

  const sp = await searchParams;
  const month = resolveMonth(sp.month);
  const data = await getSalesBreakdown(month.start, month.end);

  const cards: {
    label: string;
    icon: typeof Wallet;
    value?: number;
    node?: React.ReactNode;
  }[] = [
    {
      label: "Tổng doanh thu",
      icon: Wallet,
      node: <MoneyDisplay value={data.totalRevenueVnd} emphasis="strong" />,
    },
    {
      label: "Tổng lợi nhuận",
      icon: TrendingUp,
      node: (
        <MoneyDisplay
          value={data.totalProfitVnd}
          tone={data.totalProfitVnd >= 0 ? "positive" : "negative"}
          emphasis="strong"
        />
      ),
    },
    { label: "Tổng đơn hàng", icon: ShoppingBag, value: data.totalOrders },
    { label: "Sale có đơn", icon: Users, value: data.activeSalesCount },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Thống kê nhân viên sale"}
        description={"Doanh thu và lợi nhuận thực tế theo từng nhân viên kinh doanh."}
        actions={<MonthFilter value={month.key} label={month.label} />}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                  {card.node ?? card.value?.toLocaleString("vi-VN")}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            {"Bảng xếp hạng — " + month.label}
          </h2>
        </div>
        {data.rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={"Chưa có đơn hàng trong tháng này"}
              description={"Chọn tháng khác hoặc tạo đơn hàng mới."}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">{"#"}</TableHead>
                <TableHead>{"Nhân viên sale"}</TableHead>
                <TableHead className="text-right">{"Số đơn"}</TableHead>
                <TableHead className="text-right">{"Doanh thu"}</TableHead>
                <TableHead className="text-right">{"Lợi nhuận"}</TableHead>
                <TableHead className="text-right">{"Biên LN"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row, i) => (
                <TableRow key={row.salesUserId ?? "unassigned"}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {row.salesUserId ? i + 1 : "—"}
                  </TableCell>
                  <TableCell>
                    {row.salesUserId ? (
                      <span className="font-medium">{row.name}</span>
                    ) : (
                      <Badge tone="neutral">{row.name}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.orderCount.toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={row.revenueVnd} emphasis="strong" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay
                      value={row.profitVnd}
                      tone={row.profitVnd >= 0 ? "positive" : "negative"}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {marginLabel(row.revenueVnd, row.profitVnd)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
