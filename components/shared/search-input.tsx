"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  placeholder?: string;
  paramName?: string;
  defaultValue?: string;
  className?: string;
  debounceMs?: number;
}

export function SearchInput({
  placeholder,
  paramName = "q",
  defaultValue = "",
  className,
  debounceMs = 300,
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(sp?.toString() ?? "");
      if (value) {
        next.set(paramName, value);
      } else {
        next.delete(paramName);
      }
      next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, debounceMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
