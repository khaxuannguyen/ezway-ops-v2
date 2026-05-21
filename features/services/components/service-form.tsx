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
import { TRANSPORT_TYPE_LABEL } from "@/lib/enum-labels";
import type { ShippingTransportType } from "@/app/generated/prisma/enums";

const TRANSPORT_OPTIONS: ShippingTransportType[] = ["AIR", "SEA"];

export interface ServiceFormDefaults {
  code?: string;
  name?: string;
  transportType?: ShippingTransportType;
  destinationCode?: string;
  destinationName?: string;
  volumetricDivisor?: number;
  description?: string | null;
  isActive?: boolean;
}

export interface ServiceFormProps {
  defaults?: ServiceFormDefaults;
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
}

export function ServiceForm({ defaults, action, submitLabel }: ServiceFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const [isActive, setIsActive] = React.useState<boolean>(defaults?.isActive ?? true);

  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  return (
    <form action={formAction}>
      {state && !state.ok && state.formError ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}

      <FormSection
        title={"Định danh dịch vụ"}
        description={"Mã và tên dịch vụ vận chuyển."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={"Mã dịch vụ"}
            htmlFor="code"
            required
            error={err("code")}
            description={"Ví dụ: EZW-AIR-US-PRI. Chỉ chữ, số, gạch ngang, gạch dưới."}
          >
            <Input
              id="code"
              name="code"
              defaultValue={defaults?.code ?? ""}
              autoComplete="off"
            />
          </Field>
          <Field
            label={"Tên dịch vụ"}
            htmlFor="name"
            required
            error={err("name")}
          >
            <Input
              id="name"
              name="name"
              defaultValue={defaults?.name ?? ""}
              autoComplete="off"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title={"Phương thức & đích đến"}
        description={"Hình thức vận chuyển và quốc gia/khu vực đích."}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label={"Phương thức vận chuyển"}
            htmlFor="transportType"
            required
            error={err("transportType")}
          >
            <Select
              id="transportType"
              name="transportType"
              defaultValue={defaults?.transportType ?? "AIR"}
            >
              {TRANSPORT_OPTIONS.map((tt) => (
                <option key={tt} value={tt}>
                  {TRANSPORT_TYPE_LABEL[tt]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={"Mã đích đến"}
            htmlFor="destinationCode"
            required
            error={err("destinationCode")}
            description={"Ví dụ: US, EU, CA. Tự viết hoa."}
          >
            <Input
              id="destinationCode"
              name="destinationCode"
              defaultValue={defaults?.destinationCode ?? ""}
              autoComplete="off"
              maxLength={8}
              className="uppercase"
            />
          </Field>
          <Field
            label={"Tên đích đến"}
            htmlFor="destinationName"
            required
            error={err("destinationName")}
          >
            <Input
              id="destinationName"
              name="destinationName"
              defaultValue={defaults?.destinationName ?? ""}
              autoComplete="off"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title={"Cấu hình & mô tả"}
        description={"Hệ số quy đổi và trạng thái hoạt động."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={"Hệ số quy đổi"}
            htmlFor="volumetricDivisor"
            required
            error={err("volumetricDivisor")}
            description={"Cân quy đổi (kg) = Dài x Rộng x Cao (cm) chia cho hệ số này. Admin tự nhập tuỳ dịch vụ."}
          >
            <Input
              id="volumetricDivisor"
              name="volumetricDivisor"
              type="number"
              step="1"
              min="1"
              defaultValue={defaults?.volumetricDivisor?.toString() ?? ""}
              inputMode="numeric"
            />
          </Field>
          <Field
            label={"Đang hoạt động"}
            htmlFor="isActive"
            error={err("isActive")}
            className="self-end"
          >
            <label className="flex h-9 items-center gap-2 text-sm">
              <input
                id="isActive"
                type="checkbox"
                name="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.currentTarget.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span>{"Đang hoạt động"}</span>
            </label>
          </Field>
          <Field
            label={"Mô tả"}
            htmlFor="description"
            className="md:col-span-2"
            error={err("description")}
          >
            <Textarea
              id="description"
              name="description"
              defaultValue={defaults?.description ?? ""}
              rows={3}
            />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-2 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          {"Huỷ"}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
