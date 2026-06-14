import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin, Phone, User, Calendar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getPickupById } from "@/features/pickups/queries";
import { DriverStatusActions } from "@/features/pickups/components/driver-status-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import {
  PICKUP_STATUS_LABEL,
  PICKUP_STATUS_TONE,
} from "@/lib/enum-labels";
import { formatDateTime, formatWeight } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chi tiết lệnh",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DriverPickupDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser();

  // Đảm bảo lệnh thuộc về tài xế đang đăng nhập.
  const driver = await prisma.driver.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!driver) {
    redirect("/driver");
  }

  const pickup = await getPickupById(id);
  if (!pickup) notFound();
  if (pickup.driver?.id !== driver.id) {
    // Tài xế không được xem lệnh không thuộc mình — về dashboard.
    redirect("/driver");
  }

  return (
    <div className="space-y-4">
      <Link
        href="/driver"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {"Về danh sách"}
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-xl font-semibold">{pickup.code}</h1>
          <Badge tone={PICKUP_STATUS_TONE[pickup.currentStatus]}>
            {PICKUP_STATUS_LABEL[pickup.currentStatus]}
          </Badge>
        </div>
        {pickup.order ? (
          <p className="text-sm text-muted-foreground">
            {"Đơn liên kết: "}
            <span className="font-mono">{pickup.order.code}</span>
          </p>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{"Điểm lấy hàng"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">{pickup.pickupContactName}</p>
              {pickup.order?.customer ? (
                <p className="text-xs text-muted-foreground">
                  {"Khách: "}
                  {pickup.order.customer.name} ({pickup.order.customer.code})
                </p>
              ) : null}
            </div>
          </div>
          <a
            href={`tel:${pickup.pickupContactPhone}`}
            className="flex items-center gap-2 rounded-md border border-border bg-primary/5 px-3 py-2 font-medium text-primary active:bg-primary/10"
          >
            <Phone className="h-4 w-4" />
            <span>{pickup.pickupContactPhone}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {"Bấm để gọi"}
            </span>
          </a>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="whitespace-pre-wrap">{pickup.pickupAddress}</p>
          </div>
          {pickup.scheduledAt ? (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{"Hẹn lúc: "}{formatDateTime(pickup.scheduledAt)}</span>
            </div>
          ) : null}
          {pickup.notes ? (
            <div className="rounded-md border border-dashed border-border bg-muted/40 p-2 text-xs">
              <p className="mb-1 font-medium text-muted-foreground">
                {"Ghi chú"}
              </p>
              <p className="whitespace-pre-wrap">{pickup.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {`Kiện hàng (${pickup.packages.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pickup.packages.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Chưa có kiện hàng." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{"Mô tả"}</TableHead>
                  <TableHead className="text-right">{"Cân (kg)"}</TableHead>
                  <TableHead>{"Kích thước (cm)"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pickup.packages.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">
                      {p.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatWeight(Number(p.actualWeightKg))}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.lengthCm}×{p.widthCm}×{p.heightCm}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DriverStatusActions
            pickupId={pickup.id}
            currentStatus={pickup.currentStatus}
          />
        </CardContent>
      </Card>
    </div>
  );
}
