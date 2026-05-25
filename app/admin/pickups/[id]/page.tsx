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
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { PickupStatusForm } from "@/features/pickups/components/pickup-status-form";
import { PickupStatusTimeline } from "@/features/pickups/components/pickup-status-timeline";
import { getPickupById, listPickupStatusLogs } from "@/features/pickups/queries";
import { updatePickupStatus } from "@/features/pickups/actions";
import { formatDateTime, formatWeight } from "@/lib/format";
import { calculateOrderPackageTotals } from "@/lib/domain";
import { PICKUP_STATUS_LABEL, PICKUP_STATUS_TONE } from "@/lib/enum-labels";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Lệnh lấy hàng",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PickupDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const pickup = await getPickupById(id);
  if (!pickup) notFound();

  const isSale = user.role === "SALE";
  // SALE chỉ xem lệnh do chính mình tạo.
  if (isSale && pickup.createdById !== user.id) notFound();
  const statusAction = updatePickupStatus.bind(null, pickup.id);
  const statusLogs = await listPickupStatusLogs(pickup.id);

  const totals = calculateOrderPackageTotals(
    pickup.packages.map((p) => ({
      actualWeightKg: Number(p.actualWeightKg),
      volumetricWeightKg: Number(p.volumetricWeightKg),
      chargeableWeightKg: Number(p.chargeableWeightKg),
    }))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={pickup.code}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge tone={PICKUP_STATUS_TONE[pickup.currentStatus]}>
              {PICKUP_STATUS_LABEL[pickup.currentStatus]}
            </Badge>
            <span>
              {pickup.order ? "Đơn " + pickup.order.code : "Chưa gắn đơn hàng"}
            </span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href="/admin/pickups" variant="outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {"Quay lại"}
            </LinkButton>
            <LinkButton href={`/admin/pickups/${pickup.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden />
              {"Chỉnh sửa"}
            </LinkButton>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{"Thông tin lệnh"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Info label={"Mã lệnh lấy hàng"}>
              <span className="font-medium">{pickup.code}</span>
            </Info>
            <Info label={"Đơn hàng"}>
              {pickup.order ? (
                <span className="inline-flex items-center gap-2">
                  <Link
                    href={`/admin/orders/${pickup.order.id}`}
                    className="text-primary hover:underline"
                  >
                    {pickup.order.code}
                  </Link>
                  <OrderStatusBadge status={pickup.order.status} />
                </span>
              ) : (
                <Badge tone="warning">{"Chưa gắn đơn"}</Badge>
              )}
            </Info>
            <Info label={"Tài xế"}>
              {pickup.driver ? (
                <Link
                  href={`/admin/drivers/${pickup.driver.id}`}
                  className="text-primary hover:underline"
                >
                  {pickup.driver.user.name + " (" + pickup.driver.phone + ")"}
                </Link>
              ) : (
                <Badge tone="neutral">{"Chưa phân công"}</Badge>
              )}
            </Info>
            <Info label={"Thời gian hẹn lấy"}>
              {pickup.scheduledAt
                ? formatDateTime(pickup.scheduledAt)
                : "Chưa hẹn lịch"}
            </Info>
            <Info label={"Địa chỉ lấy hàng"} className="sm:col-span-2">
              {pickup.pickupAddress}
            </Info>
            <Info label={"Người liên hệ"}>{pickup.pickupContactName}</Info>
            <Info label={"Số điện thoại liên hệ"}>
              {pickup.pickupContactPhone}
            </Info>
            {pickup.notes ? (
              <Info label={"Ghi chú"} className="sm:col-span-2">
                {pickup.notes}
              </Info>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {isSale ? "Trạng thái" : "Cập nhật trạng thái"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSale ? (
              <div className="space-y-2">
                <Badge tone={PICKUP_STATUS_TONE[pickup.currentStatus]}>
                  {PICKUP_STATUS_LABEL[pickup.currentStatus]}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {"Quản trị viên cập nhật trạng thái và phân công tài xế."}
                </p>
              </div>
            ) : (
              <PickupStatusForm
                current={pickup.currentStatus}
                action={statusAction}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{"Kiện hàng"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pickup.packages.length === 0 ? (
            <div className="p-6">
              <EmptyState title={"Lệnh lấy hàng chưa có kiện."} />
            </div>
          ) : (
            <>
              <div className="grid gap-2 border-b border-border bg-muted/30 px-6 py-3 text-xs sm:grid-cols-4">
                <TotalCell
                  label={"Số kiện"}
                  value={totals.packageCount.toString()}
                />
                <TotalCell
                  label={"Tổng cân thực"}
                  value={formatWeight(totals.totalActualWeight)}
                />
                <TotalCell
                  label={"Tổng cân quy đổi (tạm)"}
                  value={formatWeight(totals.totalVolumetricWeight)}
                />
                <TotalCell
                  label={"Tổng cân tính cước (tạm)"}
                  value={formatWeight(totals.totalChargeableWeight)}
                  emphasis
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{"Mô tả"}</TableHead>
                    <TableHead className="text-right">{"Cân thực"}</TableHead>
                    <TableHead className="text-right">{"D×R×C (cm)"}</TableHead>
                    <TableHead className="text-right">
                      {"Cân quy đổi (tạm)"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pickup.packages.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">
                        {p.description ?? "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatWeight(p.actualWeightKg.toString())}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {p.lengthCm + "×" + p.widthCm + "×" + p.heightCm}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatWeight(p.volumetricWeightKg.toString())}
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
        <CardHeader>
          <CardTitle>{"Lịch sử trạng thái"}</CardTitle>
        </CardHeader>
        <CardContent>
          <PickupStatusTimeline logs={statusLogs} />
        </CardContent>
      </Card>
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
