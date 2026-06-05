/**
 * Cấu hình STK + bank cho Sepay (MB Bank — 2026-05-31).
 * Đọc từ env (KHÔNG hardcode STK trong source — dữ liệu nhạy cảm).
 */
export interface SepayBankConfig {
  /** STK nhận tiền (vd "6776088888" cho MB Bank EZWAY). */
  accountNumber: string;
  /** Mã bank theo VietQR (vd "MB" cho MBBank). */
  bankCode: string;
  /** Tên TK hiển thị trên QR (để khách verify trước khi chuyển). */
  accountName: string;
}

export function getSepayBankConfig(): SepayBankConfig {
  const accountNumber = process.env.SEPAY_BANK_ACCOUNT?.trim() ?? "";
  const bankCode = process.env.SEPAY_BANK_CODE?.trim() ?? "";
  const accountName = process.env.SEPAY_BANK_ACCOUNT_NAME?.trim() ?? "";
  if (!accountNumber || !bankCode) {
    throw new Error(
      "Thiếu SEPAY_BANK_ACCOUNT hoặc SEPAY_BANK_CODE trong .env."
    );
  }
  return { accountNumber, bankCode, accountName };
}

/**
 * Secret key để verify HMAC-SHA256 signature của Sepay webhook.
 * Sepay sign raw body + gửi qua header `X-SePay-Signature`.
 * Cùng giá trị phải cấu hình tại my.sepay.vn → Webhook → Bảo mật → HMAC-SHA256.
 * Trống → webhook bị từ chối (401).
 */
export function getSepayWebhookSecret(): string {
  const k = process.env.SEPAY_WEBHOOK_SECRET?.trim() ?? "";
  if (!k) {
    throw new Error("Thiếu SEPAY_WEBHOOK_SECRET trong .env.");
  }
  return k;
}
