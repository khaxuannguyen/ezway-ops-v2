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
import { USER_ROLE_LABEL, USER_ROLE_DESCRIPTION } from "@/lib/enum-labels";
import { ASSIGNABLE_ROLES, type AssignableRole } from "@/features/users/schemas";

export interface UserFormDefaults {
  name?: string;
  email?: string;
  role?: AssignableRole;
  isActive?: boolean;
}

export interface UserFormProps {
  defaults?: UserFormDefaults;
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
  /** Hiện ô nhập mật khẩu (dùng khi tạo mới). */
  withPassword?: boolean;
}

export function UserForm({
  defaults,
  action,
  submitLabel,
  withPassword = false,
}: UserFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const [role, setRole] = React.useState<AssignableRole>(
    defaults?.role ?? "STAFF"
  );
  const [isActive, setIsActive] = React.useState<boolean>(
    defaults?.isActive ?? true
  );
  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  return (
    <form action={formAction}>
      {state && !state.ok && state.formError ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}

      <FormSection
        title={"Thông tin tài khoản"}
        description={"Họ tên và email dùng để đăng nhập hệ thống."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Họ tên"} htmlFor="name" required error={err("name")}>
            <Input
              id="name"
              name="name"
              defaultValue={defaults?.name ?? ""}
              autoComplete="off"
            />
          </Field>
          <Field label={"Email"} htmlFor="email" required error={err("email")}>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaults?.email ?? ""}
              autoComplete="off"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title={"Phân quyền"}
        description={"Vai trò quyết định phạm vi truy cập của tài khoản."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={"Vai trò"}
            htmlFor="role"
            required
            error={err("role")}
            description={USER_ROLE_DESCRIPTION[role]}
          >
            <Select
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.currentTarget.value as AssignableRole)}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {USER_ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={"Trạng thái"}
            htmlFor="isActive"
            className="self-end"
            error={err("isActive")}
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
              <span>{"Cho phép đăng nhập"}</span>
            </label>
          </Field>
        </div>
      </FormSection>

      {withPassword ? (
        <FormSection
          title={"Mật khẩu"}
          description={"Mật khẩu tạm thời — chủ tài khoản nên đổi lại sau."}
        >
          <Field
            label={"Mật khẩu"}
            htmlFor="password"
            required
            error={err("password")}
            description={"Tối thiểu 6 ký tự."}
          >
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
            />
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
