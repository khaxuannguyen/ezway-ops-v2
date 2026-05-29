import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Phone, Package2, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { listPickups } from "@/features/pickups/queries";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { PICKUP_STATUS_LABEL, PICKUP_STATUS_TONE } from "@/lib/enum-labels";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Lệnh được giao",
};

export const dynamic = "force-dynamic";

export default async function DriverHomePage() {
  const user = await requireUser();

  // user.id (User.id) → Driver.id (PickupRequest.driverId trỏ về Driver.id).
  const driver = await prisma.driver.findUnique({
    where: { userId: user.id },
    select: { id: true, vehiclePlate: true, vehicleType: true },
  });

  if (!driver) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">{"Chưa có hồ sơ tài xế"}</h1>
        <EmptyState
          title="Tài khoản chưa được liên kết hồ sơ tài xế."
          description="Liên hệ quản trị viên để được tạo hồ sơ trong mục Tài xế."
        />
      </div>
    );
  }

  const active = await listPickups({
    driverId: driver.id,
    pageSize: 50,
  });
  // Đang xử lý: đã phân công nhưng chưa lấy được hàng xong.
  const inProgressStatuses = new Set([
    "ASSIGNED",
    "ACCEPTED",
    "ON_THE_WAY",
    "ARRIVED",
  ]);
  // Đã xong: lấy xong hoặc kết thúc (thất bại / huỷ).
  const doneStatuses = new Set(["PICKED_UP", "FAILED", "CANCELLED"]);
  const pending = active.rows.filter((p) =>
    inProgressStatuses.has(p.currentStatus)
  );
  const done = active.rows.filter((p) => doneStatuses.has(p.currentStatus));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{"Lệnh lấy hàng của tôi"}</h1>
        <p className="text-xs text-muted-foreground">
          {driver.vehiclePlate
            ? `Xe: ${driver.vehiclePlate} (${driver.vehicleType})`
            : `Loại xe: ${driver.vehicleType}`}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {`Đang xử lý (${pending.length})`}
        </h2>
        {pending.length === 0 ? (
          <EmptyState title="Hiện chưa có lệnh nào đang xử lý." />
        ) : (
          <ul className="space-y-2">
            {pending.map((p) => (
              <PickupCard key={p.id} pickup={p} />
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {`Đã hoàn tất (${done.length})`}
          </h2>
          <ul className="space-y-2">
            {done.map((p) => (
              <PickupCard key={p.id} pickup={p} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

type PickupCardRow = Awaited<
  ReturnType<typeof listPickups>
>["rows"][number];

function PickupCard({ pickup }: { pickup: PickupCardRow }) {
  return (
    <li>
      <Link
        href={`/driver/pickups/${pickup.id}`}
        className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 active:bg-muted"
      >
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">
              {pickup.code}
            </span>
            <Badge tone={PICKUP_STATUS_TONE[pickup.currentStatus]}>
              {PICKUP_STATUS_LABEL[pickup.currentStatus]}
            </Badge>
          </div>
          <div className="flex items-start gap-1 text-sm">
            <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div>
              <span className="font-medium">{pickup.pickupContactName}</span>
              <span className="ml-1 text-muted-foreground">
                · {pickup.pickupContactPhone}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-2">{pickup.pickupAddress}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Package2 className="h-3.5 w-3.5" />
              {pickup.packageCount} kiện
            </span>
            {pickup.scheduledAt ? (
              <span>{`Hẹn ${formatDateTime(pickup.scheduledAt)}`}</span>
            ) : null}
          </div>
        </div>
        <ChevronRight
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </Link>
    </li>
  );
}
