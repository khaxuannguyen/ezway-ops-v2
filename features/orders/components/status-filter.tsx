"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { ORDER_STATUS_LABEL, ORDER_STATUS_OPTIONS } from "@/lib/enum-labels";

export function OrderStatusFilter({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (e.target.value) {
      next.set("status", e.target.value);
    } else {
      next.delete("status");
    }
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <Select
      defaultValue={defaultValue ?? ""}
      onChange={onChange}
      className="w-48"
    >
      <option value="">{"Tất cả trạng thái"}</option>
      {ORDER_STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {ORDER_STATUS_LABEL[s]}
        </option>
      ))}
    </Select>
  );
}
