const VN_LOCALE = "vi-VN";
const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

const currencyVND = new Intl.NumberFormat(VN_LOCALE, {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const decimalVN = new Intl.NumberFormat(VN_LOCALE, {
  maximumFractionDigits: 0,
});

const weightVN = new Intl.NumberFormat(VN_LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateVN = new Intl.DateTimeFormat(VN_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: VN_TIME_ZONE,
});

const dateTimeVN = new Intl.DateTimeFormat(VN_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: VN_TIME_ZONE,
});

export type DateInput = Date | string | number | null | undefined;
export type NumberInput = number | string | bigint | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNumber(value: NumberInput): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "bigint" ? Number(value) : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatCurrencyVND(value: NumberInput, fallback = "—"): string {
  const n = toNumber(value);
  if (n === null) return fallback;
  return currencyVND.format(n);
}

export function formatNumberVN(value: NumberInput, fallback = "—"): string {
  const n = toNumber(value);
  if (n === null) return fallback;
  return decimalVN.format(n);
}

export function formatWeight(
  valueKg: NumberInput,
  fallback = "—"
): string {
  const n = toNumber(valueKg);
  if (n === null) return fallback;
  return `${weightVN.format(n)} kg`;
}

export function formatDate(value: DateInput, fallback = "—"): string {
  const d = toDate(value);
  if (!d) return fallback;
  return dateVN.format(d);
}

export function formatDateTime(value: DateInput, fallback = "—"): string {
  const d = toDate(value);
  if (!d) return fallback;
  return dateTimeVN.format(d);
}
