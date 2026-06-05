"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ignoreSepayTransaction } from "../actions";

export function IgnoreSepayButton({ sepayTxId }: { sepayTxId: string }) {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Bỏ qua giao dịch này (không liên quan đơn nào)?")) return;
        startTransition(async () => {
          await ignoreSepayTransaction(sepayTxId);
        });
      }}
    >
      {pending ? "..." : "Bỏ qua"}
    </Button>
  );
}
