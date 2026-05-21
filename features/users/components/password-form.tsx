"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/shared/field";
import { FormSection } from "@/components/shared/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fieldError, type ActionResult } from "@/lib/action-result";

export interface PasswordFormProps {
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
}

export function PasswordForm({ action }: PasswordFormProps) {
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

      <FormSection
        title={"Đặt lại mật khẩu"}
        description={"Mật khẩu mới có hiệu lực ngay sau khi lưu."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={"Mật khẩu mới"}
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
          <Field
            label={"Nhập lại mật khẩu"}
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
          {pending ? "Đang lưu..." : "Lưu mật khẩu"}
        </Button>
      </div>
    </form>
  );
}
