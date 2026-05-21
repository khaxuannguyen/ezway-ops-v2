"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { COST_CATEGORY_LABEL, COST_CATEGORY_OPTIONS } from "@/lib/enum-labels";

export function CategoryFilter({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (e.target.value) {
      next.set("category", e.target.value);
    } else {
      next.delete("category");
    }
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <Select defaultValue={defaultValue ?? ""} onChange={onChange} className="w-48">
      <option value="">{"Tất cả nhóm"}</option>
      {COST_CATEGORY_OPTIONS.map((c) => (
        <option key={c} value={c}>
          {COST_CATEGORY_LABEL[c]}
        </option>
      ))}
    </Select>
  );
}
