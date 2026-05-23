"use client";

import { useActionState } from "react";
import { Field } from "@/components/shared/field";
import { FormSection } from "@/components/shared/form-section";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { fieldError, type ActionResult } from "@/lib/action-result";
import { updateMyProfile } from "@/features/profile/actions";

export interface ProfileFormDefaults {
  name: string;
  phone: string;
  address: string;
  position: string;
  dateOfBirth: string;
  joinedAt: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  nationalId: string;
  notes: string;
}

export interface ProfileFormProps {
  email: string;
  roleLabel: string;
  defaults: ProfileFormDefaults;
}

function ReadOnly({ value }: { value: string }) {
  return (
    <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
      {value}
    </div>
  );
}

export function ProfileForm({ email, roleLabel, defaults }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(updateMyProfile, null);

  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  return (
    <form action={formAction}>
      {state?.ok ? (
        <div className="mb-4 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          {"Đã lưu hồ sơ."}
        </div>
      ) : null}
      {state && !state.ok && state.formError ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}

      <FormSection
        title={"Thông tin cơ bản"}
        description={"Email và vai trò do quản trị viên quản lý."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Họ tên"} htmlFor="name" required error={err("name")}>
            <Input id="name" name="name" defaultValue={defaults.name} />
          </Field>
          <Field label={"Email đăng nhập"}>
            <ReadOnly value={email} />
          </Field>
          <Field label={"Vai trò"}>
            <ReadOnly value={roleLabel} />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title={"Hồ sơ nhân sự"}
        description={"Thông tin cá nhân phục vụ quản lý nội bộ."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Số điện thoại"} htmlFor="phone" error={err("phone")}>
            <Input id="phone" name="phone" defaultValue={defaults.phone} />
          </Field>
          <Field label={"Chức vụ"} htmlFor="position" error={err("position")}>
            <Input
              id="position"
              name="position"
              defaultValue={defaults.position}
              placeholder="VD: Nhân viên kinh doanh"
            />
          </Field>
          <Field
            label={"Ngày sinh"}
            htmlFor="dateOfBirth"
            error={err("dateOfBirth")}
          >
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              defaultValue={defaults.dateOfBirth}
            />
          </Field>
          <Field
            label={"Ngày vào làm"}
            htmlFor="joinedAt"
            error={err("joinedAt")}
          >
            <Input
              id="joinedAt"
              name="joinedAt"
              type="date"
              defaultValue={defaults.joinedAt}
            />
          </Field>
          <Field
            label={"Địa chỉ"}
            htmlFor="address"
            className="md:col-span-2"
            error={err("address")}
          >
            <Input id="address" name="address" defaultValue={defaults.address} />
          </Field>
          <Field
            label={"Người liên hệ khẩn cấp"}
            htmlFor="emergencyContactName"
            error={err("emergencyContactName")}
          >
            <Input
              id="emergencyContactName"
              name="emergencyContactName"
              defaultValue={defaults.emergencyContactName}
            />
          </Field>
          <Field
            label={"SĐT liên hệ khẩn cấp"}
            htmlFor="emergencyContactPhone"
            error={err("emergencyContactPhone")}
          >
            <Input
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              defaultValue={defaults.emergencyContactPhone}
            />
          </Field>
          <Field
            label={"CCCD / CMND"}
            htmlFor="nationalId"
            error={err("nationalId")}
          >
            <Input
              id="nationalId"
              name="nationalId"
              defaultValue={defaults.nationalId}
            />
          </Field>
          <Field
            label={"Ghi chú"}
            htmlFor="notes"
            className="md:col-span-2"
            error={err("notes")}
          >
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={defaults.notes}
            />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-end pt-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu hồ sơ"}
        </Button>
      </div>
    </form>
  );
}
