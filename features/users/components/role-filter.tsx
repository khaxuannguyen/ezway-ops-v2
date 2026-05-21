"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { USER_ROLE_LABEL } from "@/lib/enum-labels";
import { ASSIGNABLE_ROLES } from "@/features/users/schemas";

export function RoleFilter({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (e.target.value) {
      next.set("role", e.target.value);
    } else {
      next.delete("role");
    }
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <Select defaultValue={defaultValue ?? ""} onChange={onChange} className="w-52">
      <option value="">{"Tất cả vai trò"}</option>
      {ASSIGNABLE_ROLES.map((r) => (
        <option key={r} value={r}>
          {USER_ROLE_LABEL[r]}
        </option>
      ))}
    </Select>
  );
}
