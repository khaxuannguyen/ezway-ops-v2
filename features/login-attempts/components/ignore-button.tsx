"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ignoreLoginAttempt } from "../actions";

export function IgnoreAttemptButton({ id }: { id: string }) {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Bỏ qua email này (xem là spam)?")) return;
        startTransition(async () => {
          await ignoreLoginAttempt(id);
        });
      }}
    >
      {pending ? "Đang lưu..." : "Bỏ qua"}
    </Button>
  );
}
