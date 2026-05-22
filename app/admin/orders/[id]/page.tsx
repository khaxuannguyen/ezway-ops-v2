import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { PaymentStatusBadge } from "@/components/shared/payment-status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOrderById } from "@/features/orders/queries";
import { requireUser } from "@/lib/auth";
import { formatDate, formatDateTime, formatWeight } from "@/lib/format";
import {
  PICKUP_METHOD_LABEL,
  PICKUP_STATUS_LABEL,
  PICKUP_STATUS_TONE,
  TRANSPORT_TYPE_LABEL,
} from "@/lib/enum-labels";
import { calculateOrderPackageTotals } from "@/lib/domain";

export const metadata: Metadata = {
  title: undefined,
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();
  // SALE chỉ được xem đơn của chính mình.
  if (user.role === "SALE" && order.salesUserId !== user.id) notFound();

  const packageTotals = calculateOrderPackageTotals(
    order.packages.map((p) => ({
      actualWeightKg: Number(p.actualWeightKg),
      volumetricWeightKg: Number(p.volumetricWeightKg),
      chargeableWeightKg: Number(p.chargeableWeightKg),
    }))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${order.code}`}
        description={
          <span className="inline-flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <span>{order.customer.name}</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href="/admin/orders" variant="outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {"Quay lại"}
            </LinkButton>
            <LinkButton href={`/admin/orders/${order.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden />
              {"Chỉnh sửa"}
            </LinkButton>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{"Khách hàng & dịch vụ"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Info label={"Khách hàng"}>
              <Link
                href={`/admin/customers/${order.customer.id}`}
                className="text-primary hover:underline"
              >
                {order.customer.code + " - " + order.customer.name}
              </Link>
            </Info>
            <Info label={"Dịch vụ"}>
              <div className="flex flex-col">
                <span>{order.service.name}</span>
                <span className="text-xs text-muted-foreground">
                  {TRANSPORT_TYPE_LABEL[order.service.transportType]} - {order.service.destinationName}
                </span>
              </div>
            </Info>
            <Info label={"Cân tính cước (kg)"}>
              {formatWeight(order.chargeableWeightKg.toString())}
            </Info>
            <Info label={"Phương thức lấy hàng"}>
              <Badge tone="neutral">
                {PICKUP_METHOD_LABEL[order.pickupMethod]}
              </Badge>
            </Info>
            <Info label={"Nhân viên sale"}>
              {order.salesUser ? (
                order.salesUser.name
              ) : (
                <span className="text-muted-foreground">{"Chưa gán"}</span>
              )}
            </Info>
            <Info label={"Ngày tạo"}>
              {formatDateTime(order.createdAt)}
            </Info>
            <Info label={"Cập nhật"}>
              {formatDateTime(order.updatedAt)}
            </Info>
            {order.notes ? (
              <Info label={"Ghi chú"} className="sm:col-span-2">
                {order.notes}
              </Info>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{"Cước phí"}</CardTitle>
            <CardDescription>
              {"Đơn giá gốc"}: <MoneyDisplay value={order.baseRateSnapshotVnd} />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label={"Giá gốc"}>
              <MoneyDisplay value={order.baseCostVnd} />
            </Row>
            <Row label={"Phụ phí"}>
              <MoneyDisplay value={order.extraCostTotalVnd} />
            </Row>
            <Row label={"Tổng cước thu khách"}>
              <MoneyDisplay value={order.totalFeeVnd} emphasis="strong" />
            </Row>
            <Row label={"Lợi nhuận"}>
              <MoneyDisplay
                value={order.profitVnd}
                tone={order.profitVnd >= 0 ? "positive" : "negative"}
                emphasis="strong"
              />
            </Row>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{"Danh sách kiện hàng"}</CardTitle>
          <LinkButton
            href={`/admin/packages/new?orderId=${order.id}`}
            size="sm"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {"Thêm kiện hàng"}
          </LinkButton>
        </CardHeader>
        <CardContent className="p-0">
          {order.packages.length === 0 ? (
            <div className="p-6">
              <EmptyState title={"Đơn hàng chưa có kiện hàng."} />
            </div>
          ) : (
            <>
              <div className="grid gap-2 border-b border-border bg-muted/30 px-6 py-3 text-xs sm:grid-cols-4">
                <TotalCell label={"Số kiện"} value={packageTotals.packageCount.toString()} />
                <TotalCell
                  label={"Tổng cân thực"}
                  value={formatWeight(packageTotals.totalActualWeight)}
                />
                <TotalCell
                  label={"Tổng cân quy đổi"}
                  value={formatWeight(packageTotals.totalVolumetricWeight)}
                />
                <TotalCell
                  label={"Tổng cân tính cước"}
                  value={formatWeight(packageTotals.totalChargeableWeight)}
                  emphasis
                />
              </div>
              <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{"Mã vận đơn"}</TableHead>
                  <TableHead>{"Mô tả"}</TableHead>
                  <TableHead className="text-right">{"Cân thực (kg)"}</TableHead>
                  <TableHead className="text-right">{"Cân quy đổi (kg)"}</TableHead>
                  <TableHead className="text-right">{"Cân tính cước (kg)"}</TableHead>
                  <TableHead className="text-right">{"Thao tác"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.packages.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/admin/packages/${p.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {p.trackingCode ?? "-"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.description ?? "-"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatWeight(p.actualWeightKg.toString())}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatWeight(p.volumetricWeightKg.toString())}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatWeight(p.chargeableWeightKg.toString())}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/packages/${p.id}/edit`}
                        className="text-xs text-primary hover:underline"
                      >
                        {"Chỉnh sửa"}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{"Lệnh lấy hàng"}</CardTitle>
          {order.pickupRequest ? (
            <LinkButton
              href={`/admin/pickups/${order.pickupRequest.id}`}
              variant="outline"
              size="sm"
            >
              {"Xem lệnh"}
            </LinkButton>
          ) : (
            <LinkButton href={`/admin/pickups/new?orderId=${order.id}`} size="sm">
              <Plus className="h-4 w-4" aria-hidden />
              {"Tạo lệnh lấy hàng"}
            </LinkButton>
          )}
        </CardHeader>
        <CardContent>
          {order.pickupRequest ? (
            <div className="flex items-center gap-3 text-sm">
              <Badge tone={PICKUP_STATUS_TONE[order.pickupRequest.currentStatus]}>
                {PICKUP_STATUS_LABEL[order.pickupRequest.currentStatus]}
              </Badge>
              <span className="text-muted-foreground">
                {order.pickupRequest.driver
                  ? "Tài xế: " + order.pickupRequest.driver.user.name
                  : "Chưa phân công tài xế"}
              </span>
            </div>
          ) : (
            <EmptyState title={"Đơn hàng chưa có lệnh lấy hàng."} />
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>{"Vật tư đã sử dụng"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {order.stockMovements.length === 0 ? (
            <div className="p-6">
              <EmptyState title={"Đơn hàng không khai báo vật tư."} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{"Vật tư"}</TableHead>
                  <TableHead className="text-right">{"Số lượng dùng"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.stockMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link
                        href={`/admin/supplies/${m.supply.id}`}
                        className="text-primary hover:underline"
                      >
                        {m.supply.code + " - " + m.supply.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Math.abs(m.quantityDelta).toLocaleString("vi-VN") + " " + m.supply.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{"Thanh toán"}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {order.payments.length === 0 ? (
              <div className="p-6">
                <EmptyState title={"Đơn hàng chưa có thanh toán."} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{"Trạng thái"}</TableHead>
                    <TableHead className="text-right">{"Tổng cước thu khách"}</TableHead>
                    <TableHead>{"Ngày tạo"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <PaymentStatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay value={p.amountVnd} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(p.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{"Phụ phí"}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {order.extraCosts.length === 0 ? (
              <div className="p-6">
                <EmptyState title={"Đơn hàng chưa có phụ phí."} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{"Tên khách hàng"}</TableHead>
                    <TableHead className="text-right">{"Tổng cước thu khách"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.extraCosts.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{e.nameSnapshot}</span>
                          {e.note ? (
                            <span className="text-xs text-muted-foreground">
                              {e.note}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay value={e.amountVnd} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function TotalCell({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={
          (emphasis ? "font-semibold text-foreground" : "font-medium") +
          " tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}
