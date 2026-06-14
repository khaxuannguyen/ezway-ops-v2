"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updatePickupStatus } from "@/features/pickups/actions";
import {
  allowedDriverTransitions,
  type DriverTransition,
} from "@/lib/domain/pickup-driver";
import type { PickupStatus } from "@/app/generated/prisma/enums";

export interface DriverStatusActionsProps {
  pickupId: string;
  currentStatus: PickupStatus;
}

/**
 * Buttons cho DRIVER đổi status lệnh theo state machine.
 * - Action thường (Đã nhận / Đang đến / ...) → confirm + submit
 * - Action FAILED → modal nhập lý do bắt buộc → submit
 */
export function DriverStatusActions({
  pickupId,
  currentStatus,
}: DriverStatusActionsProps) {
  const router = useRouter();
  const transitions = allowedDriverTransitions(currentStatus);
  const [pending, startTransition] = React.useTransition();
  const [reasonModal, setReasonModal] = React.useState<DriverTransition | null>(
    null
  );
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  if (transitions.length === 0) {
    return (
      <div className="rounded-md border border-border bg-muted/30 p-3 text-center text-sm text-muted-foreground">
        {"Lệnh đã đóng, không còn thao tác."}
      </div>
    );
  }

  const submit = (t: DriverTransition, note?: string) => {
    setError(null);
    const fd = new FormData();
    fd.set("currentStatus", t.to);
    if (note) fd.set("note", note);
    startTransition(async () => {
      const res = await updatePickupStatus(pickupId, null, fd);
      if (res.ok) {
        setReasonModal(null);
        setReason("");
        router.refresh();
      } else {
        setError(
          res.formError ?? res.fieldErrors?.note?.[0] ?? "Không thể đổi trạng thái."
        );
      }
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {"Cập nhật trạng thái"}
      </p>
      <div className="flex flex-col gap-2">
        {transitions.map((t) => (
          <Button
            key={t.to}
            type="button"
            variant={
              t.tone === "destructive"
                ? "outline"
                : t.tone === "primary"
                  ? "default"
                  : "outline"
            }
            disabled={pending}
            onClick={() => {
              if (t.requiresReason) {
                setReasonModal(t);
              } else {
                if (!confirm(`Xác nhận: ${t.label}?`)) return;
                submit(t);
              }
            }}
            className={
              t.tone === "destructive"
                ? "border-destructive/40 text-destructive hover:bg-destructive/5"
                : ""
            }
          >
            {pending ? "Đang lưu..." : t.label}
          </Button>
        ))}
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {/* Modal nhập lý do FAILED */}
      {reasonModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !pending && setReasonModal(null)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-xl">
            <h3 className="mb-2 text-base font-semibold">
              {reasonModal.label}
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              {"Nhập lý do (bắt buộc) để admin theo dõi:"}
            </p>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="VD: Khách không nghe máy, địa chỉ sai, hàng chưa sẵn sàng..."
              autoFocus
            />
            {error ? (
              <p className="mt-2 text-xs text-destructive">{error}</p>
            ) : null}
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setReasonModal(null);
                  setReason("");
                  setError(null);
                }}
              >
                {"Huỷ"}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending || reason.trim().length < 3}
                onClick={() => submit(reasonModal, reason.trim())}
                className="border-destructive/40 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {pending ? "Đang lưu..." : "Xác nhận"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
