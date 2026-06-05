import { getSepayBankConfig } from "./config";

/**
 * Sinh URL VietQR động cho 1 Order — khách quét, app banking tự fill
 * STK + amount + content (mã đơn). Sepay tự đối soát khi tiền về.
 *
 * Dịch vụ qr.sepay.vn miễn phí, render PNG QR EMVCo Napas247.
 * Doc: https://docs.sepay.vn/qr-tinh-static-qr.html
 *
 * @param amountVnd  Số tiền VNĐ (vd 1_500_000)
 * @param description Mã đơn để khách + Sepay map (vd "EZW2605310001")
 */
export function buildVietQRImageUrl(args: {
  amountVnd: number;
  description: string;
}): string {
  const cfg = getSepayBankConfig();
  const params = new URLSearchParams({
    acc: cfg.accountNumber,
    bank: cfg.bankCode,
    amount: String(args.amountVnd),
    des: args.description,
    template: "compact2",
    download: "false",
  });
  return `https://qr.sepay.vn/img?${params.toString()}`;
}

/** Description chuẩn cho 1 Order — uppercase + bỏ ký tự đặc biệt cho regex match. */
export function orderQrDescription(orderCode: string): string {
  // Order.code dạng "EZW-260531-0001" → "EZW2605310001"
  // Giữ ngắn để banking app không cắt content.
  return orderCode.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}
