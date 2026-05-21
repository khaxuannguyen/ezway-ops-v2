"use client";

import { useActionState } from "react";
import { login } from "@/features/auth/actions";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(login, null);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && state.formError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}

      <Field label={"Email"} htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="ten@ezway.local"
        />
      </Field>

      <Field label={"Mật khẩu"} htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>
    </form>
  );
}
