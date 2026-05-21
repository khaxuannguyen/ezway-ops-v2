import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { PickupStatusForm } from "@/features/pickups/components/pickup-status-form";
import { getPickupById } from "@/features/pickups/queries";
import { updatePickupStatus } from "@/features/pickups/actions";
import { formatDateTime } from "@/lib/format";
import { PICKUP_STATUS_LABEL, PICKUP_STATUS_TONE } from "@/lib/enum-labels";

export const metadata: Metadata = {
  title: "Lệnh lấy hàng",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PickupDetailPage({ params }: PageProps) {
  const { id } = await params;
  const pickup = await getPickupById(id);
  if (!pickup) notFound();

  const statusAction = updatePickupStatus.bind(null, pickup.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={pickup.order.code}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge tone={PICKUP_STATUS_TONE[pickup.currentStatus]}>
              {PICKUP_STATUS_LABEL[pickup.currentStatus]}
            </Badge>
            <span>{pickup.order.customer.name}</span>
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
            <Info label={"Đơn hàng"}>
              <Link href={`/admin/orders/${pickup.order.id}`} className="text-primary hover:underline">
                {pickup.order.code}
              </Link>
              <span className="ml-2">
                <OrderStatusBadge status={pickup.order.status} />
              </span>
            </Info>
            <Info label={"Khách hàng"}>
              <Link href={`/admin/customers/${pickup.order.customer.id}`} className="text-primary hover:underline">
                {pickup.order.customer.code + " - " + pickup.order.customer.name}
              </Link>
            </Info>
            <Info label={"Tài xế"}>
              {pickup.driver ? (
                <Link href={`/admin/drivers/${pickup.driver.id}`} className="text-primary hover:underline">
                  {pickup.driver.user.name + " (" + pickup.driver.phone + ")"}
                </Link>
              ) : (
                <Badge tone="neutral">{"Chưa phân công"}</Badge>
              )}
            </Info>
            <Info label={"Thời gian hẹn lấy"}>
              {pickup.scheduledAt ? formatDateTime(pickup.scheduledAt) : "Chưa hẹn lịch"}
            </Info>
            <Info label={"Địa chỉ lấy hàng"} className="sm:col-span-2">
              {pickup.pickupAddress}
            </Info>
            <Info label={"Người liên hệ"}>{pickup.pickupContactName}</Info>
            <Info label={"Số điện thoại liên hệ"}>{pickup.pickupContactPhone}</Info>
            {pickup.notes ? (
              <Info label={"Ghi chú"} className="sm:col-span-2">
                {pickup.notes}
              </Info>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{"Cập nhật trạng thái"}</CardTitle>
          </CardHeader>
          <CardContent>
            <PickupStatusForm current={pickup.currentStatus} action={statusAction} />
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
