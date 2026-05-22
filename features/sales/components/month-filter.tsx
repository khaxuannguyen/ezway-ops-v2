"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { recentMonths } from "@/features/sales/month";

export interface MonthFilterProps {
  /** Khoá tháng đang chọn (YYYY-MM). */
  value: string;
  /** Nhãn tháng đang chọn — dùng nếu tháng nằm ngoài 12 tháng gần đây. */
  label: string;
}

export function MonthFilter({ value, label }: MonthFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const options = React.useMemo(() => {
    const months = recentMonths(12);
    if (!months.some((m) => m.key === value)) {
      return [{ key: value, label }, ...months];
    }
    return months;
  }, [value, label]);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(sp?.toString() ?? "");
    next.set("month", e.target.value);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <Select value={value} onChange={onChange} className="w-48">
      {options.map((m) => (
        <option key={m.key} value={m.key}>
          {m.label}
        </option>
      ))}
    </Select>
  );
}
