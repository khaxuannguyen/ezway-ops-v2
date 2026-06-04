"use client";

import * as React from "react";
import { useActionState } from "react";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { fieldError, type ActionResult } from "@/lib/action-result";

export interface InvoiceFormDefaults {
  invoiceNumber?: string;
  lookupCode?: string;
  issuedAt?: string; // YYYY-MM-DD
  totalVnd?: number | string;
  notes?: string;
}

export interface InvoiceFormProps {
  defaults?: InvoiceFormDefaults;
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
  onSuccess?: () => void;
}

function todayInput(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}

export function InvoiceForm({
  defaults,
  action,
  submitLabel,
  onSuccess,
}: InvoiceFormProps) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);
  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  React.useEffect(() => {
    if (state?.ok && onSuccess) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-3">
      {state && !state.ok && state.formError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Số HDDT"
          htmlFor="invoiceNumber"
          required
          error={err("invoiceNumber")}
          description="Số hoá đơn trên portal EasyInvoice."
        >
          <Input
            id="invoiceNumber"
            name="invoiceNumber"
            defaultValue={defaults?.invoiceNumber ?? ""}
            placeholder="00000123"
            autoComplete="off"
            className="font-mono"
          />
        </Field>
        <Field
          label="Mã tra cứu"
          htmlFor="lookupCode"
          error={err("lookupCode")}
          description="Khách dùng để tra cứu trên cổng thuế (tuỳ chọn)."
        >
          <Input
            id="lookupCode"
            name="lookupCode"
            defaultValue={defaults?.lookupCode ?? ""}
            placeholder="ABCXYZ123"
            autoComplete="off"
            className="font-mono"
          />
        </Field>
        <Field
          label="Ngày xuất"
          htmlFor="issuedAt"
          required
          error={err("issuedAt")}
        >
          <Input
            id="issuedAt"
            name="issuedAt"
            type="date"
            defaultValue={defaults?.issuedAt ?? todayInput()}
          />
        </Field>
        <Field
          label="Tổng tiền HDDT (VNĐ)"
          htmlFor="totalVnd"
          required
          error={err("totalVnd")}
          description="Có thể khác tổng đơn nếu chia HDDT."
        >
          <MoneyInput
            name="totalVnd"
            defaultValue={defaults?.totalVnd ?? ""}
            placeholder="1.500.000"
          />
        </Field>
      </div>

      <Field label="Ghi chú" htmlFor="notes" error={err("notes")}>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={defaults?.notes ?? ""}
          rows={2}
          placeholder="VD: xuất riêng phần phụ phí..."
        />
      </Field>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
