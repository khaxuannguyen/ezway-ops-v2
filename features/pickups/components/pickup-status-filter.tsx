"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { PICKUP_STATUS_LABEL, PICKUP_STATUS_OPTIONS } from "@/lib/enum-labels";

export function PickupStatusFilter({ defaultValue }: { defaultValue?: string }) {
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
    <Select defaultValue={defaultValue ?? ""} onChange={onChange} className="w-52">
      <option value="">{"Tất cả trạng thái"}</option>
      {PICKUP_STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {PICKUP_STATUS_LABEL[s]}
        </option>
      ))}
    </Select>
  );
}
