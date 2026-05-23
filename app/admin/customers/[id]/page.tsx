import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
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
import { getCustomerWithOrders } from "@/features/customers/queries";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: undefined,
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const customer = await getCustomerWithOrders(id);
  if (!customer) notFound();
  // SALE chỉ xem khách của mình.
  if (user.role === "SALE" && customer.salesUserId !== user.id) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${customer.code} - ${customer.name}`}
        description={undefined}
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href="/admin/customers" variant="outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {"Quay lại"}
            </LinkButton>
            <LinkButton href={`/admin/customers/${customer.id}/edit`}>
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
            <Info label={"Mã khách hàng"}>{customer.code}</Info>
            <Info label={"Loại khách"}>
              {customer.isBusiness ? (
                <Badge tone="info">{"Doanh nghiệp"}</Badge>
              ) : (
                <Badge tone="neutral">{"Cá nhân"}</Badge>
              )}
            </Info>
            <Info label={"Số điện thoại"}>{customer.phone}</Info>
            <Info label={"Email"}>
              {customer.email ?? "-"}
            </Info>
            <Info label={"Địa chỉ"} className="sm:col-span-2">
              {customer.address}
            </Info>
            <Info label={"Nhân viên sale phụ trách"}>
              {customer.salesUser ? (
                customer.salesUser.name
              ) : (
                <span className="text-muted-foreground">{"Chưa gán"}</span>
              )}
            </Info>
            {customer.taxCode ? (
              <Info label={"Mã số thuế"}>
                {customer.taxCode}
              </Info>
            ) : null}
            {customer.notes ? (
              <Info label={"Ghi chú"} className="sm:col-span-2">
                {customer.notes}
              </Info>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{"Tổng số đơn hàng"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold tabular-nums text-foreground">
              {customer._count.orders}
            </p>
            <p className="text-xs text-muted-foreground">
              {"Ngày tạo"}:{" "}
              {formatDateTime(customer.createdAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{"Đơn hàng"}</CardTitle>
          <LinkButton
            href={`/admin/orders/new?customerId=${customer.id}`}
            size="sm"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {"Tạo đơn hàng"}
          </LinkButton>
        </CardHeader>
        <CardContent className="p-0">
          {customer.orders.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title={"Chưa có đơn hàng"}
                description={"Nhấn \"Tạo đơn hàng\" để bắt đầu."}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{"Mã đơn"}</TableHead>
                  <TableHead>{"Dịch vụ"}</TableHead>
                  <TableHead>{"Trạng thái"}</TableHead>
                  <TableHead className="text-right">
                    {"Tổng cước thu khách"}
                  </TableHead>
                  <TableHead>{"Ngày tạo"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {o.code}
                      </Link>
                    </TableCell>
                    <TableCell>{o.service.name}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay value={o.totalFeeVnd} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(o.createdAt)}
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
