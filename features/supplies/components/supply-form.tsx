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
import { SUPPLY_CATEGORY_LABEL, SUPPLY_CATEGORY_OPTIONS } from "@/lib/enum-labels";
import type { SupplyCategory } from "@/app/generated/prisma/enums";

export interface SupplyFormDefaults {
  code?: string;
  name?: string;
  category?: SupplyCategory;
  unit?: string;
  minStock?: number;
  notes?: string | null;
  isActive?: boolean;
}

export interface SupplyFormProps {
  defaults?: SupplyFormDefaults;
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
  isNew?: boolean;
}

export function SupplyForm({ defaults, action, submitLabel, isNew }: SupplyFormProps) {
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

      <FormSection title={"Định danh vật tư"} description={"Mã, tên và phân loại vật tư."}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Mã vật tư"} htmlFor="code" required error={err("code")} description={"Ví dụ: BOX-L, TAPE-48. 2-40 ký tự."}>
            <Input id="code" name="code" defaultValue={defaults?.code ?? ""} autoComplete="off" />
          </Field>
          <Field label={"Tên vật tư"} htmlFor="name" required error={err("name")}>
            <Input id="name" name="name" defaultValue={defaults?.name ?? ""} autoComplete="off" />
          </Field>
          <Field label={"Nhóm"} htmlFor="category" required error={err("category")}>
            <Select id="category" name="category" defaultValue={defaults?.category ?? "PACKAGING"}>
              {SUPPLY_CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {SUPPLY_CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={"Đơn vị tính"} htmlFor="unit" required error={err("unit")} description={"Ví dụ: cái, cuộn, mét, kg..."}>
            <Input id="unit" name="unit" defaultValue={defaults?.unit ?? ""} autoComplete="off" />
          </Field>
        </div>
      </FormSection>

      <FormSection title={"Tồn kho & trạng thái"} description={"Ngưỡng cảnh báo và trạng thái sử dụng."}>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={"Tồn tối thiểu"} htmlFor="minStock" required error={err("minStock")} description={"Tồn kho xuống bằng/dưới mức này sẽ được cảnh báo."}>
              <Input
                id="minStock"
                name="minStock"
                type="number"
                step="1"
                min="0"
                defaultValue={defaults?.minStock?.toString() ?? "0"}
                inputMode="numeric"
              />
            </Field>
            <Field label={"Đang sử dụng"} htmlFor="isActive" className="self-end" error={err("isActive")}>
              <label className="flex h-9 items-center gap-2 text-sm">
                <input
                  id="isActive"
                  type="checkbox"
                  name="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.currentTarget.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <span>{"Đang sử dụng"}</span>
              </label>
            </Field>
          </div>
          {isNew ? (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {"Số tồn ban đầu = 0. Dùng phiếu Nhập kho ở trang chi tiết để cập nhật tồn."}
            </p>
          ) : null}
          <Field label={"Ghi chú"} htmlFor="notes" error={err("notes")}>
            <Textarea id="notes" name="notes" defaultValue={defaults?.notes ?? ""} rows={3} />
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
