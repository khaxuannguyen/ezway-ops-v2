"use client";

import * as React from "react";
import { useActionState } from "react";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { fieldError, type ActionResult } from "@/lib/action-result";
import {
  STOCK_MOVEMENT_TYPE_LABEL,
} from "@/lib/enum-labels";
import type { StockMovementType } from "@/app/generated/prisma/enums";

const MOVE_OPTIONS: StockMovementType[] = ["IN", "OUT", "ADJUST"];

export interface StockMovementFormProps {
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
}

export function StockMovementForm({ action }: StockMovementFormProps) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const [type, setType] = React.useState<StockMovementType>("IN");
  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  return (
    <form action={formAction} className="space-y-3">
      {state && !state.ok && state.formError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}
      {state && state.ok ? (
        <div className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          {"Ghi nhận" + " OK"}
        </div>
      ) : null}

      <Field label={"Loại giao dịch"} htmlFor="type">
        <Select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as StockMovementType)}
        >
          {MOVE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {STOCK_MOVEMENT_TYPE_LABEL[m]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label={type === "ADJUST" ? "Số lượng thực tế đếm được" : "Số lượng"}
        htmlFor="quantity"
        required
        error={err("quantity")}
      >
        <Input id="quantity" name="quantity" type="number" step="1" min="0" inputMode="numeric" />
      </Field>

      <Field label={"Ghi chú"} htmlFor="note">
        <Textarea id="note" name="note" rows={2} />
      </Field>

      <Button type="submit" disabled={pending} className="w-full">
        {"Ghi nhận"}
      </Button>
    </form>
  );
}
