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
  COST_CATEGORY_LABEL,
  COST_CATEGORY_OPTIONS,
  COST_PRICING_LABEL,
  COST_PRICING_OPTIONS,
} from "@/lib/enum-labels";
import type {
  CostCategory,
  CostPricingType,
} from "@/app/generated/prisma/enums";

export interface CostItemFormDefaults {
  code?: string;
  name?: string;
  category?: CostCategory;
  pricingType?: CostPricingType;
  defaultAmountVnd?: number | null;
  unitLabel?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface CostItemFormProps {
  defaults?: CostItemFormDefaults;
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
}

export function CostItemForm({ defaults, action, submitLabel }: CostItemFormProps) {
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

      <FormSection title={"Định danh"} description={"Mã và tên khoản chi phí."}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={"Mã khoản chi phí"}
            htmlFor="code"
            required
            error={err("code")}
            description={"Ví dụ: PKG-BUBBLE, PKG-BOX-L. 2-40 ký tự."}
          >
            <Input id="code" name="code" defaultValue={defaults?.code ?? ""} autoComplete="off" />
          </Field>
          <Field label={"Tên khoản chi phí"} htmlFor="name" required error={err("name")}>
            <Input id="name" name="name" defaultValue={defaults?.name ?? ""} autoComplete="off" />
          </Field>
        </div>
      </FormSection>

      <FormSection title={"Phân loại & tính giá"} description={"Nhóm chi phí và cách tính."}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Nhóm"} htmlFor="category" required error={err("category")}>
            <Select id="category" name="category" defaultValue={defaults?.category ?? "OTHER"}>
              {COST_CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {COST_CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={"Kiểu tính giá"} htmlFor="pricingType" required error={err("pricingType")}>
            <Select id="pricingType" name="pricingType" defaultValue={defaults?.pricingType ?? "PER_UNIT"}>
              {COST_PRICING_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {COST_PRICING_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={"Đơn vị (nhãn)"}
            htmlFor="unitLabel"
            error={err("unitLabel")}
            description={"Ví dụ: lần, gói, mét vuông..."}
          >
            <Input id="unitLabel" name="unitLabel" defaultValue={defaults?.unitLabel ?? ""} autoComplete="off" />
          </Field>
          <Field
            label={"Đơn giá mặc định (VND)"}
            htmlFor="defaultAmountVnd"
            error={err("defaultAmountVnd")}
            description={"Để trống nếu báo giá riêng cho từng đơn."}
          >
            <Input
              id="defaultAmountVnd"
              name="defaultAmountVnd"
              type="number"
              step="1000"
              min="0"
              defaultValue={defaults?.defaultAmountVnd?.toString() ?? ""}
              inputMode="numeric"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title={"Trạng thái & mô tả"} description={"Trạng thái sử dụng và mô tả nội bộ."}>
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.currentTarget.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="font-medium">{"Đang sử dụng"}</span>
          </label>
          <Field label={"Mô tả"} htmlFor="description" error={err("description")}>
            <Textarea id="description" name="description" defaultValue={defaults?.description ?? ""} rows={3} />
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
