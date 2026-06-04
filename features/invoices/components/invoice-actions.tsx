"use client";

import * as React from "react";
import { Ban, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelInvoice, deleteInvoice } from "../actions";

export function CancelInvoiceButton({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: string;
  invoiceNumber: string;
}) {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Đánh dấu HDDT ${invoiceNumber} là ĐÃ HUỶ?`)) return;
        startTransition(async () => {
          await cancelInvoice(invoiceId);
        });
      }}
      title="Huỷ HDDT (vẫn giữ record để audit)"
    >
      <Ban className="h-3.5 w-3.5" aria-hidden />
      {pending ? "Đang lưu..." : "Huỷ"}
    </Button>
  );
}

export function DeleteInvoiceButton({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: string;
  invoiceNumber: string;
}) {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `Xoá hẳn record HDDT ${invoiceNumber}?\n\n` +
              "Hành động này KHÔNG khôi phục được. " +
              "Chỉ nên xoá khi ghi nhầm. " +
              "Nếu HDDT đã xuất nhưng huỷ ở portal → dùng 'Huỷ' thay vì 'Xoá'."
          )
        )
          return;
        startTransition(async () => {
          await deleteInvoice(invoiceId);
        });
      }}
      title="Xoá hẳn record (không khôi phục)"
    >
      <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden />
      {pending ? "Đang xoá..." : "Xoá"}
    </Button>
  );
}
