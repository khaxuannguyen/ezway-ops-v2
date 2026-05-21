import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { StockMovementForm } from "@/features/supplies/components/stock-movement-form";
import { getSupplyById } from "@/features/supplies/queries";
import { recordStockMovement } from "@/features/supplies/actions";
import { formatDateTime } from "@/lib/format";
import {
  SUPPLY_CATEGORY_LABEL,
  SUPPLY_CATEGORY_TONE,
  STOCK_MOVEMENT_TYPE_LABEL,
  STOCK_MOVEMENT_TYPE_TONE,
} from "@/lib/enum-labels";

export const metadata: Metadata = {
  title: "Kho vật tư",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getSupplyById(id);
  if (!data) notFound();
  const { supply, movements } = data;
  const isLow = supply.currentStock <= supply.minStock;
  const movementAction = recordStockMovement.bind(null, supply.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={supply.code + " - " + supply.name}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge tone={SUPPLY_CATEGORY_TONE[supply.category]}>
              {SUPPLY_CATEGORY_LABEL[supply.category]}
            </Badge>
            {!supply.isActive ? <Badge tone="neutral">{"Ngừng dùng"}</Badge> : null}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href="/admin/supplies" variant="outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {"Quay lại"}
            </LinkButton>
            <LinkButton href={`/admin/supplies/${supply.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden />
              {"Chỉnh sửa"}
            </LinkButton>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{"Tồn kho hiện tại"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className={"text-4xl font-semibold tabular-nums " + (isLow ? "text-destructive" : "text-foreground")}>
              {supply.currentStock.toLocaleString("vi-VN")}
              <span className="ml-2 text-base font-normal text-muted-foreground">{supply.unit}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {"Tồn tối thiểu" + ": " + supply.minStock.toLocaleString("vi-VN") + " " + supply.unit}
            </p>
            {isLow ? (
              <p className="pt-1 text-xs font-medium text-destructive">{"Tồn kho đang ở mức cảnh báo."}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{"Ghi nhận nhập / xuất / kiểm kê"}</CardTitle>
          </CardHeader>
          <CardContent>
            <StockMovementForm action={movementAction} />
          </CardContent>
        </Card>
      </div>

      {supply.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>{"Thông tin vật tư"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{supply.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{"Lịch sử giao dịch kho"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movements.length === 0 ? (
            <div className="p-6">
              <EmptyState title={"Chưa có giao dịch kho nào."} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{"Thời gian"}</TableHead>
                  <TableHead>{"Loại"}</TableHead>
                  <TableHead className="text-right">{"Thay đổi"}</TableHead>
                  <TableHead className="text-right">{"Tồn sau"}</TableHead>
                  <TableHead>{"Người thực hiện"}</TableHead>
                  <TableHead>{"Ghi chú"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(m.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge tone={STOCK_MOVEMENT_TYPE_TONE[m.type]}>
                        {STOCK_MOVEMENT_TYPE_LABEL[m.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={"tabular-nums font-medium " + (m.quantityDelta >= 0 ? "text-success" : "text-destructive")}>
                        {(m.quantityDelta > 0 ? "+" : "") + m.quantityDelta.toLocaleString("vi-VN")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      {m.stockAfter.toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-sm">{m.createdByName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.orderCode ? (
                        <Link
                          href={`/admin/orders/${m.orderId}`}
                          className="text-primary hover:underline"
                        >
                          {m.orderCode}
                        </Link>
                      ) : (
                        m.note ?? "-"
                      )}
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
