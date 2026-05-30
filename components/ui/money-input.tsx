"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input số tiền VNĐ với thousand separator live (theo `vi-VN`: `1.234.567`).
 *
 * Behavior:
 *  - Hiển thị format khi gõ + onBlur
 *  - Lưu raw number qua hidden input `name` để form gửi giá trị thuần
 *  - Caret position cố gắng giữ đúng (best-effort) khi format reflow
 *
 * Props chính:
 *  - `name`: tên field trong FormData (parent submit)
 *  - `defaultValue` / `value`: số VNĐ thuần (number hoặc string)
 *  - Các props HTML input khác đều forward
 */
export interface MoneyInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "defaultValue" | "onChange" | "type"
  > {
  name?: string;
  defaultValue?: number | string;
  value?: number | string;
  onChangeValue?: (raw: number | null) => void;
}

const NBSP = " "; // thay dấu chấm "." để tránh user nhầm dấu thập phân (giải pháp khác: dùng "," như format en-US)
const SEPARATOR = ".";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function formatDigits(digits: string): string {
  if (digits === "") return "";
  // Strip leading zeros (preserve at least 1 digit).
  const stripped = digits.replace(/^0+(?=\d)/, "");
  // Insert separator every 3 from the right.
  return stripped.replace(/\B(?=(\d{3})+(?!\d))/g, SEPARATOR);
}

function rawToNumber(raw: string): number | null {
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput(
    {
      name,
      defaultValue,
      value,
      onChangeValue,
      className,
      placeholder,
      ...rest
    },
    ref
  ) {
    const isControlled = value !== undefined;
    const initialDigits = isControlled
      ? digitsOnly(String(value ?? ""))
      : digitsOnly(String(defaultValue ?? ""));
    const [display, setDisplay] = React.useState<string>(
      formatDigits(initialDigits)
    );
    const [raw, setRaw] = React.useState<string>(initialDigits);

    // Sync khi value (controlled) thay đổi từ ngoài.
    React.useEffect(() => {
      if (isControlled) {
        const d = digitsOnly(String(value ?? ""));
        setRaw(d);
        setDisplay(formatDigits(d));
      }
    }, [value, isControlled]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      const beforeText = el.value;
      const beforeCaret = el.selectionStart ?? beforeText.length;
      // Đếm số chữ số trước caret (ignore separator).
      const digitsBeforeCaret = digitsOnly(beforeText.slice(0, beforeCaret)).length;

      const newDigits = digitsOnly(beforeText);
      const newDisplay = formatDigits(newDigits);
      setRaw(newDigits);
      setDisplay(newDisplay);
      onChangeValue?.(rawToNumber(newDigits));

      // Restore caret sau khi React render xong.
      requestAnimationFrame(() => {
        if (document.activeElement !== el) return;
        let pos = 0;
        let counted = 0;
        for (let i = 0; i < newDisplay.length; i++) {
          if (counted >= digitsBeforeCaret) break;
          if (/\d/.test(newDisplay[i])) counted++;
          pos = i + 1;
        }
        try {
          el.setSelectionRange(pos, pos);
        } catch {
          // ignore (vd input type=number không support setSelectionRange)
        }
      });
    };

    return (
      <>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-right text-sm font-medium tabular-nums shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...rest}
        />
        {name ? (
          <input type="hidden" name={name} value={raw} />
        ) : null}
      </>
    );
  }
);
