"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_STATUS_LABEL,
  EXPENSE_STATUS_OPTIONS,
} from "@/lib/enum-labels";

export function ExpenseFilters({
  category,
  status,
}: {
  category?: string;
  status?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex gap-2">
      <Select
        defaultValue={category ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
        className="w-48"
      >
        <option value="">{"Tất cả nhóm"}</option>
        {EXPENSE_CATEGORY_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {EXPENSE_CATEGORY_LABEL[c]}
          </option>
        ))}
      </Select>
      <Select
        defaultValue={status ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="w-44"
      >
        <option value="">{"Tất cả trạng thái"}</option>
        {EXPENSE_STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {EXPENSE_STATUS_LABEL[s]}
          </option>
        ))}
      </Select>
    </div>
  );
}
