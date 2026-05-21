"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { TRANSPORT_TYPE_LABEL } from "@/lib/enum-labels";

const OPTIONS = ["AIR", "SEA"] as const;

export function TransportFilter({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (e.target.value) {
      next.set("transportType", e.target.value);
    } else {
      next.delete("transportType");
    }
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <Select defaultValue={defaultValue ?? ""} onChange={onChange} className="w-48">
      <option value="">{"Tất cả phương thức"}</option>
      {OPTIONS.map((tt) => (
        <option key={tt} value={tt}>
          {TRANSPORT_TYPE_LABEL[tt]}
        </option>
      ))}
    </Select>
  );
}
