"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/shared/field";
import { FormSection } from "@/components/shared/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { fieldError, type ActionResult } from "@/lib/action-result";
import { VEHICLE_TYPE_LABEL, VEHICLE_TYPE_OPTIONS } from "@/lib/enum-labels";
import type { VehicleType } from "@/app/generated/prisma/enums";

export interface DriverFormDefaults {
  name?: string;
  email?: string;
  phone?: string;
  vehicleType?: VehicleType;
  vehiclePlate?: string | null;
  isActive?: boolean;
}

export interface DriverFormProps {
  defaults?: DriverFormDefaults;
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
}

export function DriverForm({ defaults, action, submitLabel }: DriverFormProps) {
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

      <FormSection title={"Tài khoản tài xế"} description={"Tên và email đăng nhập của tài xế."}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Tên tài xế"} htmlFor="name" required error={err("name")}>
            <Input id="name" name="name" defaultValue={defaults?.name ?? ""} autoComplete="off" />
          </Field>
          <Field label={"Email"} htmlFor="email" required error={err("email")}>
            <Input id="email" name="email" type="email" defaultValue={defaults?.email ?? ""} autoComplete="off" />
          </Field>
        </div>
      </FormSection>

      <FormSection title={"Phương tiện & liên hệ"} description={"Loại xe, biển số và số điện thoại."}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Số điện thoại"} htmlFor="phone" required error={err("phone")}>
            <Input id="phone" name="phone" defaultValue={defaults?.phone ?? ""} autoComplete="off" inputMode="tel" />
          </Field>
          <Field label={"Loại phương tiện"} htmlFor="vehicleType" required error={err("vehicleType")}>
            <Select id="vehicleType" name="vehicleType" defaultValue={defaults?.vehicleType ?? "MOTORBIKE"}>
              {VEHICLE_TYPE_OPTIONS.map((vt) => (
                <option key={vt} value={vt}>
                  {VEHICLE_TYPE_LABEL[vt]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={"Biển số xe"} htmlFor="vehiclePlate" error={err("vehiclePlate")}>
            <Input id="vehiclePlate" name="vehiclePlate" defaultValue={defaults?.vehiclePlate ?? ""} autoComplete="off" />
          </Field>
          <Field label={"Đang hoạt động"} htmlFor="isActive" className="self-end" error={err("isActive")}>
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
