"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { manualMatchSepayTransaction } from "../actions";

export function ManualMatchForm({ sepayTxId }: { sepayTxId: string }) {
  const [orderCode, setOrderCode] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  const [isError, setIsError] = React.useState(false);

  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        placeholder="EZW-260531-0001"
        value={orderCode}
        onChange={(e) => setOrderCode(e.target.value)}
        className="h-8 font-mono text-xs"
      />
      <Button
        type="button"
        size="sm"
        disabled={pending || !orderCode.trim()}
        onClick={() => {
          setMsg(null);
          startTransition(async () => {
            const res = await manualMatchSepayTransaction(sepayTxId, orderCode);
            if (res.ok) {
              setMsg("✓ Match thành công");
              setIsError(false);
              setOrderCode("");
            } else {
              setMsg(res.formError ?? res.fieldErrors?.orderCode?.[0] ?? "Lỗi");
              setIsError(true);
            }
          });
        }}
      >
        {pending ? "..." : "Match"}
      </Button>
      {msg ? (
        <span
          className={
            "text-xs " + (isError ? "text-destructive" : "text-success")
          }
        >
          {msg}
        </span>
      ) : null}
    </div>
  );
}
