export function padSequence(seq: number, width = 4): string {
  return String(seq).padStart(width, "0");
}

export function formatDateYYMMDD(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export function buildCustomerCode(seq: number): string {
  return `CUS-${padSequence(seq, 4)}`;
}

export function buildOrderCode(seq: number, date: Date = new Date()): string {
  return `EZW-${formatDateYYMMDD(date)}-${padSequence(seq, 4)}`;
}

export function buildStartupExpenseCode(seq: number): string {
  return `CP-${padSequence(seq, 4)}`;
}
