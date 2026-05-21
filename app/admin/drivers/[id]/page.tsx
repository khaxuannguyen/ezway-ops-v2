import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDriverById } from "@/features/drivers/queries";
import { formatDateTime } from "@/lib/format";
import { VEHICLE_TYPE_LABEL } from "@/lib/enum-labels";

export const metadata: Metadata = {
  title: "Tài xế",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DriverDetailPage({ params }: PageProps) {
  const { id } = await params;
  const driver = await getDriverById(id);
  if (!driver) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={driver.user.name}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge tone="neutral">{VEHICLE_TYPE_LABEL[driver.vehicleType]}</Badge>
            <span>{driver.phone}</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href="/admin/drivers" variant="outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {"Quay lại"}
            </LinkButton>
            <LinkButton href={`/admin/drivers/${driver.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden />
              {"Chỉnh sửa"}
            </LinkButton>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{"Thông tin tài xế"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Info label={"Tên tài xế"}>{driver.user.name}</Info>
            <Info label={"Email"}>{driver.user.email}</Info>
            <Info label={"Số điện thoại"}>{driver.phone}</Info>
            <Info label={"Loại phương tiện"}>
              <Badge tone="neutral">{VEHICLE_TYPE_LABEL[driver.vehicleType]}</Badge>
            </Info>
            <Info label={"Biển số xe"}>
              {driver.vehiclePlate ?? "Chưa có biển số"}
            </Info>
            <Info label={"Trạng thái"}>
              {driver.isActive ? (
                <Badge tone="success">{"Hoạt động"}</Badge>
              ) : (
                <Badge tone="neutral">{"Tạm ngưng"}</Badge>
              )}
            </Info>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{"Số lệnh lấy hàng"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold tabular-nums">
              {driver._count.pickupRequests.toLocaleString("vi-VN")}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(driver.createdAt)}
            </p>
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
