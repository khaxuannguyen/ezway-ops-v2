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

export interface SalesUserOption {
  id: string;
  name: string;
}

export interface CustomerFormDefaults {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string;
  nationalId?: string | null;
  isBusiness?: boolean;
  taxCode?: string | null;
  notes?: string | null;
  salesUserId?: string | null;
}

export interface CustomerFormProps {
  defaults?: CustomerFormDefaults;
  /** Nếu truyền — hiện ô chọn sale phụ trách (chỉ ADMIN). */
  salesUsers?: SalesUserOption[];
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
}

export function CustomerForm({
  defaults,
  salesUsers,
  action,
  submitLabel,
}: CustomerFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const [isBusiness, setIsBusiness] = React.useState<boolean>(
    defaults?.isBusiness ?? false
  );

  const err = (n: string) =>
    state ? fieldError(state, n) : undefined;

  return (
    <form action={formAction} className="space-y-0">
      {state && !state.ok && state.formError ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}

      <FormSection
        title={"Thông tin chung"}
        description={"Thông tin định danh và liên hệ."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={"Tên khách hàng"}
            htmlFor="name"
            required
            error={err("name")}
            className="md:col-span-2"
          >
            <Input
              id="name"
              name="name"
              defaultValue={defaults?.name ?? ""}
              autoComplete="off"
            />
          </Field>
          <Field
            label={"Số điện thoại"}
            htmlFor="phone"
            required
            error={err("phone")}
          >
            <Input
              id="phone"
              name="phone"
              defaultValue={defaults?.phone ?? ""}
              autoComplete="off"
              inputMode="tel"
            />
          </Field>
          <Field
            label={"Email"}
            htmlFor="email"
            error={err("email")}
          >
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaults?.email ?? ""}
              autoComplete="off"
            />
          </Field>
          <Field
            label={"Địa chỉ"}
            htmlFor="address"
            required
            error={err("address")}
            className="md:col-span-2"
          >
            <Textarea
              id="address"
              name="address"
              defaultValue={defaults?.address ?? ""}
              rows={2}
            />
          </Field>
          <Field
            label={"CCCD / Căn cước (tuỳ chọn)"}
            htmlFor="nationalId"
            description={"Cần cho khai báo hải quan khi gửi quốc tế."}
            error={err("nationalId")}
            className="md:col-span-2"
          >
            <Input
              id="nationalId"
              name="nationalId"
              defaultValue={defaults?.nationalId ?? ""}
              autoComplete="off"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title={"Phân loại & ghi chú"}
        description={"Phân loại khách và ghi chú nội bộ."}
      >
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isBusiness"
              checked={isBusiness}
              onChange={(e) => setIsBusiness(e.currentTarget.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="font-medium">{"Khách doanh nghiệp"}</span>
          </label>
          <Field
            label={"Mã số thuế"}
            htmlFor="taxCode"
            required={isBusiness}
            error={err("taxCode")}
          >
            <Input
              id="taxCode"
              name="taxCode"
              defaultValue={defaults?.taxCode ?? ""}
              autoComplete="off"
              disabled={!isBusiness}
            />
          </Field>
          <Field
            label={"Ghi chú"}
            htmlFor="notes"
            error={err("notes")}
          >
            <Textarea
              id="notes"
              name="notes"
              defaultValue={defaults?.notes ?? ""}
              rows={3}
            />
          </Field>
        </div>
      </FormSection>

      {salesUsers ? (
        <FormSection
          title={"Phân công"}
          description={"Nhân viên sale phụ trách khách hàng này (gỡ khoá / chuyển sang sale khác)."}
        >
          <Field
            label={"Nhân viên sale phụ trách"}
            htmlFor="salesUserId"
            error={err("salesUserId")}
          >
            <Select
              id="salesUserId"
              name="salesUserId"
              defaultValue={defaults?.salesUserId ?? ""}
            >
              <option value="">{"— Chưa gán —"}</option>
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
        </FormSection>
      ) : null}

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
