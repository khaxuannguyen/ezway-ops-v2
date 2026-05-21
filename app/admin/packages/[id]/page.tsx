import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { getPackageById } from "@/features/packages/queries";
import { formatDateTime, formatWeight } from "@/lib/format";

export const metadata: Metadata = {
  title: "Kiện hàng",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PackageDetailPage({ params }: PageProps) {
  const { id } = await params;
  const pkg = await getPackageById(id);
  if (!pkg) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={pkg.trackingCode ?? "Kiện hàng"}
        description={
          <Link
            href={`/admin/orders/${pkg.order.id}`}
            className="text-primary hover:underline"
          >
            {pkg.order.code}
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href="/admin/packages" variant="outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {"Quay lại"}
            </LinkButton>
            <LinkButton href={`/admin/packages/${pkg.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden />
              {"Chỉnh sửa"}
            </LinkButton>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{"Liên kết đơn hàng"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label={"Đơn hàng"}>
              <Link
                href={`/admin/orders/${pkg.order.id}`}
                className="text-primary hover:underline"
              >
                {pkg.order.code}
              </Link>
            </Info>
            <Info label={"Khách hàng"}>
              <Link
                href={`/admin/customers/${pkg.order.customer.id}`}
                className="text-primary hover:underline"
              >
                {pkg.order.customer.code + " - " + pkg.order.customer.name}
              </Link>
            </Info>
            <Info label={"Trạng thái"}>
              <OrderStatusBadge status={pkg.order.status} />
            </Info>
            <Info label={"Mã vận đơn"}>
              {pkg.trackingCode ?? "-"}
            </Info>
            <Info label={"Mô tả"}>
              {pkg.description ?? "-"}
            </Info>
            <Info label={"Ngày tạo"}>
              {formatDateTime(pkg.createdAt)}
            </Info>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{"Kích thước & cân nặng"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label={"Cân thực (kg)"}>
              {formatWeight(pkg.actualWeightKg.toString())}
            </Info>
            <Info label={"Dài (cm)"}>
              {pkg.lengthCm + " cm"}
            </Info>
            <Info label={"Rộnng (cm)"}>
              {pkg.widthCm + " cm"}
            </Info>
            <Info label={"Cao (cm)"}>
              {pkg.heightCm + " cm"}
            </Info>
            <Info label={"Cân quy đổi (kg)"}>
              {formatWeight(pkg.volumetricWeightKg.toString())}
            </Info>
            <Info label={"Cân tính cước (kg)"}>
              <span className="font-semibold">
                {formatWeight(pkg.chargeableWeightKg.toString())}
              </span>
            </Info>
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
    <div className={"flex items-center justify-between gap-3 " + (className ?? "")}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="text-sm text-foreground text-right">{children}</div>
    </div>
  );
}
