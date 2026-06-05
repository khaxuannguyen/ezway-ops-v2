/**
 * Trích Order.code từ memo chuyển khoản (content) — best-effort.
 *
 * Order.code format: "EZW-YYMMDD-NNNN" (vd "EZW-260531-0001").
 * Khách quét VietQR động → description chuẩn "EZW2605310001" (sạch).
 * Khách gõ tay → có thể "ezw 260531 001", "EZW-260531-1", "EZWAY EZW260531001"...
 *
 * Match strategy:
 *  1. Normalize: bỏ dấu cách / gạch / chấm, viết hoa
 *  2. Regex `EZW(\d{6})(\d{1,4})` bắt prefix + ngày + sequence
 *  3. Build lại Order.code chuẩn (padStart 4 chữ số)
 */
export interface ExtractedOrderCode {
  raw: string; // chuỗi gốc match (vd "EZW260531001")
  canonical: string; // dạng chuẩn DB (vd "EZW-260531-0001")
}

export function extractOrderCodes(content: string): ExtractedOrderCode[] {
  if (!content) return [];
  const normalized = content.replace(/[\s.\-_/,()]+/g, "").toUpperCase();
  const re = /EZW(\d{6})(\d{1,4})/g;
  const found: ExtractedOrderCode[] = [];
  const seen = new Set<string>();
  for (const m of normalized.matchAll(re)) {
    const yymmdd = m[1];
    const seq = m[2].padStart(4, "0");
    const canonical = `EZW-${yymmdd}-${seq}`;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    found.push({ raw: m[0], canonical });
  }
  return found;
}
