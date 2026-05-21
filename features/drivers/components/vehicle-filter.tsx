"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { VEHICLE_TYPE_LABEL, VEHICLE_TYPE_OPTIONS } from "@/lib/enum-labels";

export function VehicleFilter({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (e.target.value) {
      next.set("vehicleType", e.target.value);
    } else {
      next.delete("vehicleType");
    }
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <Select defaultValue={defaultValue ?? ""} onChange={onChange} className="w-52">
      <option value="">{"Tất cả phương tiện"}</option>
      {VEHICLE_TYPE_OPTIONS.map((vt) => (
        <option key={vt} value={vt}>
          {VEHICLE_TYPE_LABEL[vt]}
        </option>
      ))}
    </Select>
  );
}
