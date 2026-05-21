"use client";

import * as React from "react";
import { useActionState } from "react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { type ActionResult } from "@/lib/action-result";
import { PICKUP_STATUS_LABEL, PICKUP_STATUS_OPTIONS } from "@/lib/enum-labels";
import type { PickupStatus } from "@/app/generated/prisma/enums";

export interface PickupStatusFormProps {
  current: PickupStatus;
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
}

export function PickupStatusForm({ current, action }: PickupStatusFormProps) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex items-center gap-2">
        <Select name="currentStatus" defaultValue={current} className="w-52">
          {PICKUP_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {PICKUP_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
      {state && !state.ok && state.formError ? (
        <p className="text-xs text-destructive">{state.formError}</p>
      ) : null}
    </form>
  );
}
