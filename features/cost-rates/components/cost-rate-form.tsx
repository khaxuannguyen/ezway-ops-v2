"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/shared/field";
import { FormSection } from "@/components/shared/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { fieldError, type ActionResult } from "@/lib/action-result";
import {
  COST_RATE_TYPE_LABEL,
  COST_RATE_TYPE_OPTIONS,
} from "@/lib/enum-labels";
import type { CostRateType } from "@/app/generated/prisma/enums";

export interface ServiceOption {
  id: string;
  code: string;
  name: string;
}

export interface CostRateFormDefaults {
  serviceId?: string;
  minWeightKg?: number | string;
  maxWeightKg?: number | string;
  rateType?: CostRateType;
  amountVnd?: number;
  validFrom?: Date | string | null;
  validTo?: Date | string | null;
  notes?: string | null;
}

export interface CostRateFormProps {
  services: ServiceOption[];
  defaults?: CostRateFormDefaults;
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
  lockService?: boolean;
}

function toDateInput(d?: Date | string | null): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return yyyy + "-" + mm + "-" + dd;
}

export function CostRateForm({
  services,
  defaults,
  action,
  submitLabel,
  lockService,
}: CostRateFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  return (
    <form action={formAction}>
      {state && !state.ok && state.formError ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}

      <FormSection title={"Dịch vụ áp dụng"} description={"Bậc giá thuộc dịch vụ nào."}>
        <Field label={"Dịch vụ"} htmlFor="serviceId" required error={err("serviceId")}>
          <Select
            id="serviceId"
            name={lockService && defaults?.serviceId ? undefined : "serviceId"}
            defaultValue={defaults?.serviceId ?? ""}
            disabled={lockService}
          >
            <option value="">--</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code + " - " + s.name}
              </option>
            ))}
          </Select>
          {lockService && defaults?.serviceId ? (
            <input type="hidden" name="serviceId" value={defaults.serviceId} />
          ) : null}
        </Field>
      </FormSection>

      <FormSection title={"Khoảng cân & đơn giá"} description={"Định mức theo dải cân, áp đơn giá."}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Cân tối thiểu (kg)"} htmlFor="minWeightKg" required error={err("minWeightKg")}>
            <Input
              id="minWeightKg"
              name="minWeightKg"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaults?.minWeightKg?.toString() ?? ""}
              inputMode="decimal"
            />
          </Field>
          <Field label={"Cân tối đa (kg)"} htmlFor="maxWeightKg" required error={err("maxWeightKg")}>
            <Input
              id="maxWeightKg"
              name="maxWeightKg"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={defaults?.maxWeightKg?.toString() ?? ""}
              inputMode="decimal"
            />
          </Field>
          <Field label={"Kiểu tính"} htmlFor="rateType" required error={err("rateType")}>
            <Select id="rateType" name="rateType" defaultValue={defaults?.rateType ?? "PER_KG"}>
              {COST_RATE_TYPE_OPTIONS.map((rt) => (
                <option key={rt} value={rt}>
                  {COST_RATE_TYPE_LABEL[rt]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={"Đơn giá (VND)"} htmlFor="amountVnd" required error={err("amountVnd")}>
            <Input
              id="amountVnd"
              name="amountVnd"
              type="number"
              step="1000"
              min="0"
              defaultValue={defaults?.amountVnd?.toString() ?? ""}
              inputMode="numeric"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title={"Hiệu lực & ghi chú"} description={"Khoảng thời gian áp dụng bậc giá."}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Hiệu lực từ"} htmlFor="validFrom" required error={err("validFrom")}>
            <Input
              id="validFrom"
              name="validFrom"
              type="date"
              defaultValue={toDateInput(defaults?.validFrom) || toDateInput(new Date())}
            />
          </Field>
          <Field label={"Hiệu lực đến (tuỳ chọn)"} htmlFor="validTo" error={err("validTo")}>
            <Input
              id="validTo"
              name="validTo"
              type="date"
              defaultValue={toDateInput(defaults?.validTo)}
            />
          </Field>
          <Field label={"Ghi chú"} htmlFor="notes" className="md:col-span-2" error={err("notes")}>
            <Textarea id="notes" name="notes" defaultValue={defaults?.notes ?? ""} rows={2} />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-2 pt-6">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          {"Huỷ"}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
