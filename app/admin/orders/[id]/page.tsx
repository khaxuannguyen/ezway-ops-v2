import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Send, Undo2 } from "lucide-react";
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
import { listPaymentsByOrder } from "@/features/payments/queries";
import { createPayment } from "@/features/payments/actions";
import { PaymentForm } from "@/features/payments/components/payment-form";
import { PaymentsTable } from "@/features/payments/components/payments-table";
import { DeleteOrderButton } from "@/features/orders/components/delete-order-button";
import { unmarkOrderForwardedForm } from "@/features/orders/actions";
import { listInvoicesByOrder } from "@/features/invoices/queries";
import { createInvoice } from "@/features/invoices/actions";
import { InvoiceForm } from "@/features/invoices/components/invoice-form";
import {
  CancelInvoiceButton,
  DeleteInvoiceButton,
} from "@/features/invoices/components/invoice-actions";
import { listSepayTransactionsByOrder } from "@/features/sepay/queries";
import { VietQRCard } from "@/features/sepay/components/vietqr-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatWeight, formatCurrencyVND, formatDate } from "@/lib/format";
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

  const packages = order.pickupRequest?.packages ?? [];
  const packageTotals = calculateOrderPackageTotals(
    packages.map((p) => ({
      actualWeightKg: Number(p.actualWeightKg),
      volumetricWeightKg: Number(p.volumetricWeightKg),
      chargeableWeightKg: Number(p.chargeableWeightKg),
      quantity: p.quantity,
    }))
  );

  const payments = await listPaymentsByOrder(order.id);
  const invoices = await listInvoicesByOrder(order.id);
  const sepayTxs = await listSepayTransactionsByOrder(order.id);
  const remainingVnd = order.totalFeeVnd - order.paidVnd;
  const canManagePayments = user.role === "ADMIN" || user.role === "STAFF";
  const canManageForwarding = user.role === "ADMIN" || user.role === "STAFF";
  const canManageInvoices = user.role === "ADMIN" || user.role === "STAFF";
  const isAdmin = user.role === "ADMIN";
  const createPaymentAction = createPayment.bind(null, order.id);
  const createInvoiceAction = createInvoice.bind(null, order.id);
  const unmarkForwardedAction = unmarkOrderForwardedForm.bind(null, order.id);
  const hasIssuedInvoice = invoices.some((inv) => inv.status === "ISSUED");

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
            {canManageForwarding && !order.carrierForwardedAt ? (
              <LinkButton href={`/admin/orders/${order.id}/forward`}>
                <Send className="h-4 w-4" aria-hidden />
                {"Đẩy carrier"}
              </LinkButton>
            ) : null}
            <LinkButton href={`/admin/orders/${order.id}/edit`} variant="outline">
              <Pencil className="h-4 w-4" aria-hidden />
              {"Chỉnh sửa"}
            </LinkButton>
            {isAdmin ? (
              <DeleteOrderButton orderId={order.id} orderCode={order.code} />
            ) : null}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{"Người nhận quốc tế"}</CardTitle>
            {!order.recipient ? (
              <Badge tone="warning">{"Chưa có"}</Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {order.recipient ? (
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <Info label={"Người nhận"}>{order.recipient.contactName}</Info>
                <Info label={"Số điện thoại"}>{order.recipient.phone}</Info>
                <Info label={"Địa chỉ"} className="sm:col-span-2">
                  <span className="whitespace-pre-line">
                    {order.recipient.address ?? "—"}
                  </span>
                </Info>
              </div>
            ) : (
              <EmptyState
                title={"Đơn này chưa có người nhận quốc tế."}
                description={"Vào Chỉnh sửa để bổ sung — bắt buộc trước khi đẩy carrier."}
              />
            )}
          </CardContent>
        </Card>

        <Card
          className={
            order.carrierForwardedAt
              ? "border-success/40 bg-success/5"
              : "border-warning/40 bg-warning/5"
          }
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{"Đẩy carrier"}</CardTitle>
            {order.carrierForwardedAt ? (
              <Badge tone="success">{"Đã đẩy"}</Badge>
            ) : (
              <Badge tone="warning">{"Chưa đẩy"}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {order.carrierForwardedAt ? (
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <Info label={"Carrier"}>
                  <Badge tone="primary">{order.carrierCode ?? "—"}</Badge>
                </Info>
                <Info label={"Tracking number"}>
                  <span className="font-medium tabular-nums">
                    {order.carrierTrackingNumber ?? "—"}
                  </span>
                </Info>
                <Info label={"Reference carrier"}>
                  {order.carrierReferenceCode ?? "—"}
                </Info>
                <Info label={"Đẩy lúc"}>
                  {formatDateTime(order.carrierForwardedAt)}
                </Info>
                <Info label={"Đẩy bởi"}>
                  {order.carrierForwardedBy?.name ?? "—"}
                </Info>
                {order.carrierNote ? (
                  <Info label={"Ghi chú"} className="sm:col-span-2">
                    {order.carrierNote}
                  </Info>
                ) : null}
                {isAdmin ? (
                  <form action={unmarkForwardedAction} className="sm:col-span-2">
                    <Button type="submit" variant="outline" size="sm">
                      <Undo2 className="h-3.5 w-3.5" aria-hidden />
                      {"Bỏ đánh dấu (admin only)"}
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {
                    "Đơn chưa được đẩy lên carrier upstream. Mở Copy Helper để khai báo và đánh dấu khi xong."
                  }
                </p>
                {canManageForwarding ? (
                  <LinkButton href={`/admin/orders/${order.id}/forward`}>
                    <Send className="h-4 w-4" aria-hidden />
                    {"Mở Copy Helper → Đẩy"}
                  </LinkButton>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {order.invoiceItems.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {"Khai báo Invoice (" +
                order.customsExportType +
                ", $" +
                (order.totalDeclaredValueUsd
                  ? Number(order.totalDeclaredValueUsd).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00") +
                ")"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{"Description"}</TableHead>
                  <TableHead className="text-right">{"Qty"}</TableHead>
                  <TableHead>{"Unit"}</TableHead>
                  <TableHead className="text-right">{"Unit Price USD"}</TableHead>
                  <TableHead className="text-right">{"Total USD"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.invoiceItems.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-sm">{it.description}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {it.quantity}
                    </TableCell>
                    <TableCell className="text-sm">{it.unit}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {"$" +
                        Number(it.unitPriceUsd).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {"$" +
                        Number(it.totalValueUsd).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{"Kiện hàng"}</CardTitle>
          {order.pickupRequest ? (
            <LinkButton
              href={`/admin/pickups/${order.pickupRequest.id}/edit`}
              variant="outline"
              size="sm"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              {"Sửa kiện hàng"}
            </LinkButton>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {packages.length === 0 ? (
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
                    <TableHead>{"Mô tả"}</TableHead>
                    <TableHead className="text-right">{"Cân thực (kg)"}</TableHead>
                    <TableHead className="text-right">{"Cân quy đổi (kg)"}</TableHead>
                    <TableHead className="text-right">{"Cân tính cước (kg)"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((p) => (
                    <TableRow key={p.id}>
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
          ) : null}
        </CardHeader>
        <CardContent>
          {order.pickupRequest ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium">{order.pickupRequest.code}</span>
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
            <EmptyState title={"Đơn hàng chưa gắn lệnh lấy hàng."} />
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{"Thanh toán"}</CardTitle>
          <PaymentStatusBadge status={order.paymentStatus} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <PaymentStat label={"Tổng cước"} value={order.totalFeeVnd} />
            <PaymentStat
              label={"Đã thu"}
              value={order.paidVnd}
              tone={order.paidVnd > 0 ? "positive" : "default"}
            />
            <PaymentStat
              label={remainingVnd < 0 ? "Hoàn dư" : "Còn lại"}
              value={Math.abs(remainingVnd)}
              tone={remainingVnd > 0 ? "negative" : "positive"}
              emphasis
            />
          </div>

          <div className="rounded-md border border-border">
            <PaymentsTable rows={payments} canManage={canManagePayments} />
          </div>

          {remainingVnd > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {"QR thanh toán (khách quét — tự đối soát Sepay)"}
              </p>
              <VietQRCard orderCode={order.code} amountVnd={remainingVnd} />
            </div>
          ) : null}

          {sepayTxs.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {"Giao dịch ngân hàng đã đối soát"}
              </p>
              <div className="overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{"Thời gian"}</TableHead>
                      <TableHead>{"Mã đối soát"}</TableHead>
                      <TableHead>{"Memo"}</TableHead>
                      <TableHead className="text-right">{"Số tiền"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sepayTxs.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs">
                          {formatDateTime(tx.transactionDate)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {tx.referenceCode ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs">
                          {tx.content}
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay value={tx.amountVnd} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          {canManagePayments ? (
            <div className="rounded-md border border-dashed border-border p-4">
              <p className="mb-3 text-sm font-medium">{"Ghi nhận thanh toán tay"}</p>
              <p className="mb-3 text-xs text-muted-foreground">
                {
                  "Dành cho tiền mặt / COD / chuyển khoản không qua Sepay. Khoản chuyển khoản về STK MB sẽ tự ghi nhận khi memo chứa mã đơn."
                }
              </p>
              <PaymentForm
                action={createPaymentAction}
                submitLabel={"Ghi nhận"}
                remainingVnd={remainingVnd > 0 ? remainingVnd : undefined}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{"Hoá đơn điện tử (HDDT)"}</CardTitle>
            <CardDescription>
              {hasIssuedInvoice
                ? `${invoices.filter((i) => i.status === "ISSUED").length} HDDT đã xuất cho đơn này.`
                : "Chưa xuất HDDT. Xuất ở portal EasyInvoice rồi nhập mã vào đây để tracking."}
            </CardDescription>
          </div>
          {hasIssuedInvoice ? (
            <Badge tone="success">{"Đã xuất HDDT"}</Badge>
          ) : (
            <Badge tone="warning">{"Chưa xuất"}</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {invoices.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{"Số HDDT"}</TableHead>
                    <TableHead>{"Mã tra cứu"}</TableHead>
                    <TableHead>{"Ngày xuất"}</TableHead>
                    <TableHead className="text-right">{"Tiền HDDT"}</TableHead>
                    <TableHead>{"Trạng thái"}</TableHead>
                    <TableHead>{"Người ghi"}</TableHead>
                    {canManageInvoices ? (
                      <TableHead className="text-right">{"Thao tác"}</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono font-semibold">
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {inv.lookupCode ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(inv.issuedAt)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrencyVND(inv.totalVnd)}
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
                      </TableCell>
                      {canManageInvoices ? (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {inv.status === "ISSUED" ? (
                              <CancelInvoiceButton
                                invoiceId={inv.id}
                                invoiceNumber={inv.invoiceNumber}
                              />
                            ) : null}
                            <DeleteInvoiceButton
                              invoiceId={inv.id}
                              invoiceNumber={inv.invoiceNumber}
                            />
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}

          {canManageInvoices ? (
            <div className="rounded-md border border-dashed border-border p-4">
              <p className="mb-3 text-sm font-medium">
                {"Ghi nhận HDDT mới"}
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                {
                  "Sau khi xuất HDDT trên portal EasyInvoice, nhập số/mã/ngày vào đây để app tracking."
                }
              </p>
              <InvoiceForm
                action={createInvoiceAction}
                submitLabel="Lưu HDDT"
                defaults={{ totalVnd: order.totalFeeVnd }}
              />
            </div>
          ) : null}
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
                  <TableHead>{"Khoản"}</TableHead>
                  <TableHead className="text-right">{"Số tiền"}</TableHead>
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
  );
}

function PaymentStat({
  label,
  value,
  tone,
  emphasis,
}: {
  label: string;
  value: number;
  tone?: "default" | "positive" | "negative";
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg">
        <MoneyDisplay
          value={value}
          tone={tone ?? "default"}
          emphasis={emphasis ? "strong" : "normal"}
        />
      </p>
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
