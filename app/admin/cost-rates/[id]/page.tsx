import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getServiceCostTable } from "@/features/cost-rates/queries";
import { deleteCostRate } from "@/features/cost-rates/actions";
import { formatDate, formatWeight } from "@/lib/format";
import { TRANSPORT_TYPE_LABEL } from "@/lib/enum-labels";
import type { CostTableRate } from "@/features/cost-rates/queries";

export const metadata: Metadata = {
  title: "Bảng giá chi phí",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceCostTablePage({ params }: PageProps) {
  const { id } = await params;
  const data = await getServiceCostTable(id);
  if (!data) notFound();
  const { service, fixedRates, perKgRates, rateCount } = data;

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
            <span className="text-muted-foreground">
              {"\u00b7 " + rateCount + " bậc giá"}
            </span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href="/admin/cost-rates" variant="outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {"Quay lại"}
            </LinkButton>
            {rateCount > 0 ? (
              <LinkButton href={`/admin/cost-rates/${service.id}/edit`} variant="outline">
                <Pencil className="h-4 w-4" aria-hidden />
                {"Sửa tất cả"}
              </LinkButton>
            ) : null}
            <LinkButton href={`/admin/cost-rates/new?serviceId=${service.id}`}>
              <Plus className="h-4 w-4" aria-hidden />
              {"Thêm bảng giá"}
            </LinkButton>
          </div>
        }
      />

      {rateCount === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              title={"Dịch vụ chưa có bảng giá"}
              description={"Nhấn nút Thêm bảng giá để nhập các mốc và bậc giá."}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{"Mốc cố định"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {fixedRates.length === 0 ? (
                <div className="p-6">
                  <EmptyState title={"Chưa có mốc cố định."} />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{"Mốc cân (kg)"}</TableHead>
                      <TableHead className="text-right">{"Đơn giá"}</TableHead>
                      <TableHead>{"Hiệu lực từ"}</TableHead>
                      <TableHead>{"Hiệu lực đến"}</TableHead>
                      <TableHead className="text-right">{"Thao tác"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fixedRates.map((r: CostTableRate) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm tabular-nums">
                          {formatWeight(r.minWeightKg)}
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay value={r.amountVnd} emphasis="strong" />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(r.validFrom)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.validTo ? formatDate(r.validTo) : (
                            <Badge tone="success">{"Đang áp dụng"}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <RowActions rateId={r.id} />
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
              <CardTitle>{"Bậc theo kg"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {perKgRates.length === 0 ? (
                <div className="p-6">
                  <EmptyState title={"Chưa có bậc theo kg."} />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{"Khoảng cân (kg)"}</TableHead>
                      <TableHead className="text-right">{"Đơn giá"}</TableHead>
                      <TableHead>{"Hiệu lực từ"}</TableHead>
                      <TableHead>{"Hiệu lực đến"}</TableHead>
                      <TableHead className="text-right">{"Thao tác"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perKgRates.map((r: CostTableRate) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm tabular-nums">
                          {formatWeight(r.minWeightKg) + " - " + formatWeight(r.maxWeightKg)}
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay value={r.amountVnd} emphasis="strong" />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(r.validFrom)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.validTo ? formatDate(r.validTo) : (
                            <Badge tone="success">{"Đang áp dụng"}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <RowActions rateId={r.id} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function RowActions({ rateId }: { rateId: string }) {
  return (
    <div className="flex items-center justify-end gap-3">
      <Link
        href={`/admin/cost-rates/rate/${rateId}/edit`}
        className="text-xs text-primary hover:underline"
      >
        {"Sửa"}
      </Link>
      <form action={deleteCostRate.bind(null, rateId)}>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="h-auto px-1 py-0 text-xs text-destructive hover:bg-destructive/10"
        >
          {"Xóa"}
        </Button>
      </form>
    </div>
  );
}
