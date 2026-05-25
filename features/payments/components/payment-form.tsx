"use client";

import * as React from "react";
import { useActionState } from "react";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { fieldError, type ActionResult } from "@/lib/action-result";
import type { PaymentMethod } from "@/app/generated/prisma/enums";

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Tiền mặt" },
  { value: "BANK_TRANSFER", label: "Chuyển khoản" },
  { value: "COD", label: "COD (thu hộ)" },
  { value: "OTHER", label: "Khác" },
];

export interface PaymentFormDefaults {
  amountVnd?: number;
  method?: PaymentMethod;
  paidAt?: string;
  reference?: string | null;
  notes?: string | null;
}

export interface PaymentFormProps {
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
  defaults?: PaymentFormDefaults;
  submitLabel: string;
  remainingVnd?: number;
  onSuccess?: () => void;
}

function todayLocalISO(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function PaymentForm({
  action,
  defaults,
  submitLabel,
  remainingVnd,
  onSuccess,
}: PaymentFormProps) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);
  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  const wasOk = React.useRef(false);
  React.useEffect(() => {
    if (state?.ok && !wasOk.current) {
      wasOk.current = true;
      onSuccess?.();
    }
  }, [state, onSuccess]);

  const defaultPaidAt = defaults?.paidAt ?? todayLocalISO();
  const defaultAmount =
    defaults?.amountVnd != null
      ? String(defaults.amountVnd)
      : remainingVnd != null && remainingVnd > 0
        ? String(remainingVnd)
        : "";

  return (
    <form action={formAction} className="space-y-3">
      {state && !state.ok && state.formError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}

      <Field
        label={"Số tiền (VND, âm = hoàn tiền)"}
        htmlFor="amountVnd"
        required
        error={err("amountVnd")}
        description={
          remainingVnd != null && remainingVnd > 0
            ? `Còn lại đơn này: ${remainingVnd.toLocaleString("vi-VN")} ₫`
            : undefined
        }
      >
        <Input
          id="amountVnd"
          name="amountVnd"
          type="number"
          step="1"
          inputMode="numeric"
          defaultValue={defaultAmount}
        />
      </Field>

      <Field label={"Phương thức"} htmlFor="method" required>
        <Select
          id="method"
          name="method"
          defaultValue={defaults?.method ?? "CASH"}
        >
          {METHOD_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label={"Ngày thu"}
        htmlFor="paidAt"
        required
        error={err("paidAt")}
      >
        <Input
          id="paidAt"
          name="paidAt"
          type="date"
          defaultValue={defaultPaidAt}
        />
      </Field>

      <Field
        label={"Mã tham chiếu (số chuyển khoản, biên lai...)"}
        htmlFor="reference"
      >
        <Input id="reference" name="reference" defaultValue={defaults?.reference ?? ""} />
      </Field>

      <Field label={"Ghi chú"} htmlFor="notes">
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaults?.notes ?? ""} />
      </Field>

      <Button type="submit" disabled={pending} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
