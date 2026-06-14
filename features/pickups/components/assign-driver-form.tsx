"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { assignPickupDriver } from "@/features/pickups/actions";
import type { DriverLiteOption } from "@/features/drivers/queries";

export interface AssignDriverFormProps {
  pickupId: string;
  currentDriverId: string | null;
  drivers: DriverLiteOption[];
}

/**
 * Gán/đổi/bỏ tài xế inline trên Pickup detail page — không cần vào form Edit.
 * ADMIN/STAFF. Khi gán lần đầu (driverId từ null) → backend tự flip
 * PickupStatus PENDING → ASSIGNED.
 */
export function AssignDriverForm({
  pickupId,
  currentDriverId,
  drivers,
}: AssignDriverFormProps) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string>(currentDriverId ?? "");
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  const [isError, setIsError] = React.useState(false);

  const changed = selected !== (currentDriverId ?? "");

  return (
    <div className="space-y-2">
      <Select
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          setMsg(null);
        }}
      >
        <option value="">{"— Chưa phân công —"}</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} · {d.phone}
            {d.vehiclePlate ? ` · ${d.vehiclePlate}` : ""}
          </option>
        ))}
      </Select>
      <div className="flex items-center justify-end gap-2">
        {msg ? (
          <span
            className={
              "text-xs " + (isError ? "text-destructive" : "text-success")
            }
          >
            {msg}
          </span>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={pending || !changed}
          onClick={() => {
            setMsg(null);
            startTransition(async () => {
              const res = await assignPickupDriver(
                pickupId,
                selected || null
              );
              if (res.ok) {
                setMsg("✓ Đã lưu");
                setIsError(false);
                router.refresh();
              } else {
                setMsg(res.formError ?? "Không thể lưu");
                setIsError(true);
              }
            });
          }}
        >
          {pending ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
      {drivers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {"Chưa có tài xế nào active. Vào "}
          <a href="/admin/drivers" className="text-primary hover:underline">
            {"/admin/drivers"}
          </a>
          {" để thêm."}
        </p>
      ) : null}
    </div>
  );
}
