import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  listInvoicesInPeriod,
  listOrdersWithoutInvoice,
} from "@/features/invoices/queries";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { requireUser } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Hoá đơn điện tử",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ tab?: string; month?: string }>;
}

function parseMonth(s: string | undefined): { from: Date; to: Date; label: string } {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-indexed
  if (s) {
    const m = s.match(/^(\d{4})-(\d{2})$/);
    if (m) {
      year = Number(m[1]);
      month = Number(m[2]) - 1;
    }
  }
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 1);
  const label = `${String(month + 1).padStart(2, "0")}/${year}`;
  return { from, to, label };
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "STAFF") {
    redirect("/admin/dashboard");
  }
  const sp = await searchParams;
  const tab = sp.tab ?? "pending";
  const period = parseMonth(sp.month);

  const [pending, issued] = await Promise.all([
    listOrdersWithoutInvoice({ take: 200 }),
    listInvoicesInPeriod({ from: period.from, to: period.to }),
  ]);

  const issuedTotal = issued
    .filter((i) => i.status === "ISSUED")
    .reduce((s, i) => s + i.totalVnd, 0);

  const monthInputValue = `${period.from.getFullYear()}-${String(period.from.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hoá đơn điện tử (HDDT)"
        description="Tracking đơn nào đã xuất HDDT trên portal EasyInvoice. Đối soát kế toán cuối tháng."
        actions={
          <LinkButton
            href={`/api/invoices/export?from=${period.from.toISOString().slice(0, 10)}&to=${period.to.toISOString().slice(0, 10)}`}
            variant="outline"
          >
            <Download className="h-4 w-4" aria-hidden />
            {`Xuất Excel ${period.label}`}
          </LinkButton>
        }
      />

      <div className="flex items-center gap-2 border-b border-border">
        <Link
          href="/admin/invoices?tab=pending"
          className={cn(
            "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            tab === "pending"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {"Cần xuất"}
          {pending.length > 0 ? (
            <Badge tone="warning">{pending.length}</Badge>
          ) : null}
        </Link>
        <Link
          href={`/admin/invoices?tab=issued&month=${monthInputValue}`}
          className={cn(
            "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            tab === "issued"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {`Đã xuất ${period.label}`}
        </Link>
      </div>

      {tab === "pending" ? (
          <Card>
            <CardHeader>
              <CardTitle>{`Đơn cần xuất HDDT (${pending.length})`}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pending.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="Tất cả đơn đã xuất HDDT."
                    description="Khi có đơn DELIVERED/CLOSED chưa xuất HDDT, sẽ xuất hiện ở đây."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{"Mã đơn"}</TableHead>
                      <TableHead>{"Khách hàng"}</TableHead>
                      <TableHead>{"Trạng thái"}</TableHead>
                      <TableHead>{"Tạo"}</TableHead>
                      <TableHead className="text-right">{"Tổng cước"}</TableHead>
                      <TableHead className="text-right">{"Thao tác"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Link
                            href={`/admin/orders/${row.id}`}
                            className="font-mono font-semibold text-primary hover:underline"
                          >
                            {row.code}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.customerName}
                          <div className="text-xs text-muted-foreground">
                            {row.customerCode}
                          </div>
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge
                            status={row.status as "DELIVERED" | "CLOSED"}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(row.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay value={row.totalFeeVnd} />
                        </TableCell>
                        <TableCell className="text-right">
                          <LinkButton
                            href={`/admin/orders/${row.id}#hoa-don`}
                            size="sm"
                            variant="outline"
                          >
                            {"Ghi HDDT"}
                          </LinkButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>{`HDDT đã xuất tháng ${period.label}`}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {`${issued.length} HDDT · tổng `}
                  <span className="font-semibold text-foreground">
                    <MoneyDisplay value={issuedTotal} />
                  </span>
                </p>
              </div>
              <form className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">{"Tháng:"}</label>
                <input
                  type="month"
                  name="month"
                  defaultValue={monthInputValue}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                />
                <input type="hidden" name="tab" value="issued" />
                <button
                  type="submit"
                  className="h-9 rounded-md border border-input px-3 text-sm hover:bg-muted"
                >
                  {"Lọc"}
                </button>
              </form>
            </CardHeader>
            <CardContent className="p-0">
              {issued.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title={`Chưa có HDDT nào xuất trong ${period.label}.`}
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{"Số HDDT"}</TableHead>
                      <TableHead>{"Mã đơn"}</TableHead>
                      <TableHead>{"Khách"}</TableHead>
                      <TableHead>{"Ngày xuất"}</TableHead>
                      <TableHead className="text-right">{"Tiền HDDT"}</TableHead>
                      <TableHead>{"Trạng thái"}</TableHead>
                      <TableHead>{"Người ghi"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issued.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono font-semibold">
                          {inv.invoiceNumber}
                          {inv.lookupCode ? (
                            <div className="font-mono text-xs text-muted-foreground">
                              {inv.lookupCode}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/orders/${inv.orderId}`}
                            className="font-mono text-primary hover:underline"
                          >
                            {inv.orderCode}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">
                          {inv.customerName}
                          <div className="text-xs text-muted-foreground">
                            {inv.customerCode}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(inv.issuedAt)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <MoneyDisplay value={inv.totalVnd} />
                        </TableCell>
                        <TableCell>
                          {inv.status === "ISSUED" ? (
                            <Badge tone="success">{"Đã xuất"}</Badge>
                          ) : (
                            <Badge tone="neutral">{"Đã huỷ"}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {inv.recordedBy.name}
                          <div className="text-[10px]">
                            {formatDateTime(inv.createdAt)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      )}
    </div>
  );
}
