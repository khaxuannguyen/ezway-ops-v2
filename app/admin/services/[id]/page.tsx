import type { Metadata } from "next";
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
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyDisplay } from "@/components/shared/money-display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getServiceById } from "@/features/services/queries";
import { formatDate, formatDateTime, formatWeight } from "@/lib/format";
import { TRANSPORT_TYPE_LABEL } from "@/lib/enum-labels";

export const metadata: Metadata = {
  title: "Dịch vụ",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const service = await getServiceById(id);
  if (!service) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={service.code + " - " + service.name}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge tone={service.transportType === "AIR" ? "info" : "primary"}>
              {TRANSPORT_TYPE_LABEL[service.transportType]}
            </Badge>
            <span>{service.destinationName}</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href="/admin/services" variant="outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {"Quay lại"}
            </LinkButton>
            <LinkButton href={`/admin/services/${service.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden />
              {"Chỉnh sửa"}
            </LinkButton>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{"Thông tin chung"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Info label={"Mã dịch vụ"}>{service.code}</Info>
            <Info label={"Tên dịch vụ"}>{service.name}</Info>
            <Info label={"Phương thức vận chuyển"}>
              <Badge tone={service.transportType === "AIR" ? "info" : "primary"}>
                {TRANSPORT_TYPE_LABEL[service.transportType]}
              </Badge>
            </Info>
            <Info label={"Mã đích đến"}>
              {service.destinationCode + " - " + service.destinationName}
            </Info>
            <Info label={"Hệ số quy đổi"}>
              <span className="tabular-nums">{service.volumetricDivisor.toLocaleString("vi-VN")}</span>
            </Info>
            <Info label={"Trạng thái"}>
              {service.isActive ? (
                <Badge tone="success">{"Hoạt động"}</Badge>
              ) : (
                <Badge tone="neutral">{"Tạm ngưng"}</Badge>
              )}
            </Info>
            {service.description ? (
              <Info label={"Mô tả"} className="sm:col-span-2">
                {service.description}
              </Info>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{"Đơn hàng"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold tabular-nums text-foreground">
              {service._count.orders.toLocaleString("vi-VN")}
            </p>
            <p className="text-xs text-muted-foreground">
              {"Bậc giá"}: {service._count.rates.toLocaleString("vi-VN")}
            </p>
            <p className="text-xs text-muted-foreground">
              {"Hiệu lực từ"}: {formatDateTime(service.createdAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{"Bậc giá gần nhất"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {service.rates.length === 0 ? (
            <div className="p-6">
              <EmptyState title={"Chưa cấu hình bậc giá."} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{"Khoảng cân (kg)"}</TableHead>
                  <TableHead>{"Kiểu tính"}</TableHead>
                  <TableHead className="text-right">{"Đơn giá"}</TableHead>
                  <TableHead>{"Hiệu lực từ"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {service.rates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {formatWeight(r.minWeightKg.toString()) + " - " + formatWeight(r.maxWeightKg.toString())}
                    </TableCell>
                    <TableCell>
                      <Badge tone={r.rateType === "PER_KG" ? "info" : "neutral"}>
                        {r.rateType === "PER_KG" ? "Theo kg" : "Cố định"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay value={r.amountVnd} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(r.validFrom)}
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
