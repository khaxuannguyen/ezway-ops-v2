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
import { MoneyDisplay } from "@/components/shared/money-display";
import { getCostItemById } from "@/features/cost-items/queries";
import { formatDateTime } from "@/lib/format";
import {
  COST_CATEGORY_LABEL,
  COST_CATEGORY_TONE,
  COST_PRICING_LABEL,
} from "@/lib/enum-labels";

export const metadata: Metadata = {
  title: "Khoản chi phí",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CostItemDetailPage({ params }: PageProps) {
  const { id } = await params;
  const item = await getCostItemById(id);
  if (!item) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.code + " - " + item.name}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge tone={COST_CATEGORY_TONE[item.category]}>
              {COST_CATEGORY_LABEL[item.category]}
            </Badge>
            <span>{COST_PRICING_LABEL[item.pricingType]}</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href="/admin/cost-items" variant="outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {"Quay lại"}
            </LinkButton>
            <LinkButton href={`/admin/cost-items/${item.id}/edit`}>
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
            <Info label={"Mã khoản chi phí"}>{item.code}</Info>
            <Info label={"Tên khoản chi phí"}>{item.name}</Info>
            <Info label={"Nhóm"}>
              <Badge tone={COST_CATEGORY_TONE[item.category]}>
                {COST_CATEGORY_LABEL[item.category]}
              </Badge>
            </Info>
            <Info label={"Kiểu tính giá"}>
              {COST_PRICING_LABEL[item.pricingType]}
            </Info>
            <Info label={"Đơn vị (nhãn)"}>{item.unitLabel ?? "-"}</Info>
            <Info label={"Đơn giá mặc định (VND)"}>
              <MoneyDisplay value={item.defaultAmountVnd ?? null} tone={item.defaultAmountVnd == null ? "muted" : "default"} />
            </Info>
            <Info label={"Trạng thái"}>
              {item.isActive ? (
                <Badge tone="success">{"Đang dùng"}</Badge>
              ) : (
                <Badge tone="neutral">{"Ngừng dùng"}</Badge>
              )}
            </Info>
            {item.description ? (
              <Info label={"Mô tả"} className="sm:col-span-2">
                {item.description}
              </Info>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{"Lượt áp dụng"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold tabular-nums">
              {item._count.extraCosts.toLocaleString("vi-VN")}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(item.createdAt)}
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
