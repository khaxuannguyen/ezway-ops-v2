"use client";

import { useActionState } from "react";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fieldError, type ActionResult } from "@/lib/action-result";
import { changeMyPassword } from "@/features/profile/actions";

export function PasswordChangeForm() {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(changeMyPassword, null);

  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok ? (
        <div className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          {"Đã đổi mật khẩu."}
        </div>
      ) : null}
      {state && !state.ok && state.formError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}

      <Field
        label={"Mật khẩu hiện tại"}
        htmlFor="currentPassword"
        required
        error={err("currentPassword")}
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label={"Mật khẩu mới"}
          htmlFor="newPassword"
          required
          error={err("newPassword")}
          description={"Tối thiểu 6 ký tự."}
        >
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
          />
        </Field>
        <Field
          label={"Nhập lại mật khẩu mới"}
          htmlFor="confirm"
          required
          error={err("confirm")}
        >
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
          />
        </Field>
      </div>

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : "Đổi mật khẩu"}
        </Button>
      </div>
    </form>
  );
}
