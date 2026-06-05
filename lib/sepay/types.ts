/**
 * Payload Sepay POST về webhook.
 * Spec: https://docs.sepay.vn/tich-hop-webhooks.html
 */
export interface SepayWebhookPayload {
  /** Sepay internal ID — idempotency key. */
  id: number;
  /** Tên ngân hàng (vd "MBBank"). */
  gateway: string;
  /** "YYYY-MM-DD HH:mm:ss" giờ VN. */
  transactionDate: string;
  /** STK nhận tiền (vd "6776088888"). */
  accountNumber: string;
  /** Sepay tự parse code nếu memo có prefix SEVQR — null nếu không. */
  code: string | null;
  /** Memo chuyển khoản. */
  content: string;
  /** "in" hoặc "out". */
  transferType: "in" | "out";
  /** Số tiền (in → +, out → -). VND nguyên. */
  transferAmount: number;
  /** Số dư sau giao dịch — tham khảo. */
  accumulated: number;
  /** Sub-account hoặc null. */
  subAccount: string | null;
  /** Mã FT ngân hàng (vd "FT12345"). */
  referenceCode: string | null;
  /** Description raw SMS / push notification. */
  description: string;
}

export function isValidSepayPayload(o: unknown): o is SepayWebhookPayload {
  if (!o || typeof o !== "object") return false;
  const x = o as Record<string, unknown>;
  return (
    typeof x.id === "number" &&
    typeof x.accountNumber === "string" &&
    typeof x.transferType === "string" &&
    typeof x.transferAmount === "number" &&
    typeof x.transactionDate === "string" &&
    typeof x.content === "string"
  );
}
