"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteOrder } from "../actions";

export function DeleteOrderButton({
  orderId,
  orderCode,
}: {
  orderId: string;
  orderCode: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          const ok = window.confirm(
            `Xoá đơn ${orderCode}?\n\n` +
              "• Đơn sẽ ẩn khỏi danh sách.\n" +
              "• Vật tư đã xuất cho đơn sẽ tự hoàn kho.\n" +
              "• Thanh toán (nếu có) sẽ ẩn theo đơn.\n\n" +
              "Nếu nhầm: liên hệ kỹ thuật để khôi phục từ DB."
          );
          if (!ok) return;
          setError(null);
          startTransition(async () => {
            const res = await deleteOrder(orderId);
            if (res.ok) {
              router.replace("/admin/orders");
              router.refresh();
            } else {
              setError(res.formError ?? "Không thể xoá đơn.");
            }
          });
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
        {pending ? "Đang xoá..." : "Xoá đơn"}
      </Button>
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : null}
    </>
  );
}
