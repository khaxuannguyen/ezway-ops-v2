import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LinkButton } from "@/components/ui/link-button";
import { Send } from "lucide-react";
import { listProcessingQueue } from "@/features/orders/queries";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Queue xử lý carrier",
};

export default async function ProcessingPage() {
  const rows = await listProcessingQueue();

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Queue xử lý carrier"}
        description={
          "Đơn cần đẩy lên Kango/KSN/Go (chưa đánh dấu 'đã đẩy'). Click vào đơn để mở Copy Helper."
        }
        actions={
          <Badge tone={rows.length > 0 ? "warning" : "neutral"}>
            {rows.length + " đơn pending"}
          </Badge>
        }
      />

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-10">
              <EmptyState
                title={"Hết queue!"}
                description={"Mọi đơn đã được đẩy lên carrier."}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{"Mã đơn"}</TableHead>
                  <TableHead>{"Khách"}</TableHead>
                  <TableHead>{"Dịch vụ"}</TableHead>
                  <TableHead>{"Người nhận"}</TableHead>
                  <TableHead className="text-right">{"Số kiện"}</TableHead>
                  <TableHead className="text-right">{"Cước"}</TableHead>
                  <TableHead className="text-right">{"Khai (USD)"}</TableHead>
                  <TableHead>{"Sale"}</TableHead>
                  <TableHead>{"Trạng thái"}</TableHead>
                  <TableHead>{"Tạo lúc"}</TableHead>
                  <TableHead className="text-right">{"Đẩy"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${r.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {r.code}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{r.customer.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.customer.code}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.service.name}</TableCell>
                    <TableCell className="text-sm">
                      {r.recipient ? (
                        <div className="flex flex-col">
                          <span>{r.recipient.contactName}</span>
                          <span className="text-xs text-muted-foreground">
                            {r.recipient.city + " · " + r.recipient.country}
                          </span>
                        </div>
                      ) : (
                        <Badge tone="warning">{"Chưa có"}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.packageCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay value={r.totalFeeVnd} />
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {r.totalDeclaredValueUsd != null
                        ? "$" +
                          r.totalDeclaredValueUsd.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.salesUser?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <LinkButton
                        href={`/admin/orders/${r.id}/forward`}
                        size="sm"
                      >
                        <Send className="h-3.5 w-3.5" aria-hidden />
                        {"Đẩy"}
                      </LinkButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
