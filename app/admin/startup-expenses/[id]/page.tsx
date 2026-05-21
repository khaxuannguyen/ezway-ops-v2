import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { getStartupExpenseById } from "@/features/startup-expenses/queries";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_CATEGORY_TONE,
  EXPENSE_STATUS_LABEL,
  EXPENSE_STATUS_TONE,
} from "@/lib/enum-labels";

export const metadata: Metadata = {
  title: "Chi phí thành lập",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StartupExpenseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const expense = await getStartupExpenseById(id);
  if (!expense) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={expense.code + " - " + expense.itemName}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge tone={EXPENSE_CATEGORY_TONE[expense.category]}>
              {EXPENSE_CATEGORY_LABEL[expense.category]}
            </Badge>
            <Badge tone={EXPENSE_STATUS_TONE[expense.status]}>
              {EXPENSE_STATUS_LABEL[expense.status]}
            </Badge>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href="/admin/startup-expenses" variant="outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {"Quay lại"}
            </LinkButton>
            <LinkButton href={`/admin/startup-expenses/${expense.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden />
              {"Chỉnh sửa"}
            </LinkButton>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{"Chi tiết khoản chi"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Info label="ID">{expense.code}</Info>
          <Info label={"Tên khoản chi"}>{expense.itemName}</Info>
          <Info label={"Nhóm chi phí"}>
            <Badge tone={EXPENSE_CATEGORY_TONE[expense.category]}>
              {EXPENSE_CATEGORY_LABEL[expense.category]}
            </Badge>
          </Info>
          <Info label={"Số tiền (VND)"}>
            <MoneyDisplay value={expense.amountVnd} emphasis="strong" />
          </Info>
          <Info label={"Trạng thái"}>
            <Badge tone={EXPENSE_STATUS_TONE[expense.status]}>
              {EXPENSE_STATUS_LABEL[expense.status]}
            </Badge>
          </Info>
          <Info label={"Ngày thanh toán"}>
            {expense.paymentDate ? formatDate(expense.paymentDate) : "Chưa có"}
          </Info>
          <Info label={"Người thanh toán"}>{expense.paidBy ?? "Chưa rõ"}</Info>
          <Info label="">{""}</Info>
          {expense.note ? (
            <Info label={"Ghi chú"} className="sm:col-span-2">
              {expense.note}
            </Info>
          ) : null}
          <Info label="" className="sm:col-span-2">
            <span className="text-xs text-muted-foreground">
              {formatDateTime(expense.createdAt)}
            </span>
          </Info>
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
  if (!label) return null;
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}
