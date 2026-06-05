"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input s峄?ti峄乶 VN膼 v峄沬 thousand separator live (theo `vi-VN`: `1.234.567`).
 *
 * Behavior:
 *  - Hi峄僴 th峄?format khi g玫 + onBlur
 *  - L瓢u raw number qua hidden input `name` 膽峄?form g峄璱 gi谩 tr峄?thu岷
 *  - Caret position c峄?g岷痭g gi峄?膽煤ng (best-effort) khi format reflow
 *
 * Props ch铆nh:
 *  - `name`: t锚n field trong FormData (parent submit)
 *  - `defaultValue` / `value`: s峄?VN膼 thu岷 (number ho岷穋 string)
 *  - C谩c props HTML input kh谩c 膽峄乽 forward
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

    // Sync khi value (controlled) thay 膽峄昳 t峄?ngo脿i.
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
      // 膼岷縨 s峄?ch峄?s峄?tr瓢峄沜 caret (ignore separator).
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
          // ignore (vd input type=number kh么ng support setSelectionRange)
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
