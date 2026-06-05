import { buildVietQRImageUrl, orderQrDescription } from "@/lib/sepay/vietqr";
import { getSepayBankConfig } from "@/lib/sepay/config";
import { formatCurrencyVND } from "@/lib/format";

interface VietQRCardProps {
  orderCode: string;
  amountVnd: number;
}

/**
 * Hiển thị VietQR (Napas247) cho khách quét app ngân hàng — tự fill STK +
 * số tiền + nội dung (mã đơn). Sepay tự đối soát khi tiền về.
 */
export function VietQRCard({ orderCode, amountVnd }: VietQRCardProps) {
  if (amountVnd <= 0) return null;

  let cfg: ReturnType<typeof getSepayBankConfig>;
  try {
    cfg = getSepayBankConfig();
  } catch {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Chưa cấu hình STK Sepay trong .env (SEPAY_BANK_ACCOUNT / SEPAY_BANK_CODE).
      </div>
    );
  }

  const description = orderQrDescription(orderCode);
  const qrUrl = buildVietQRImageUrl({ amountVnd, description });

  return (
    <div className="grid gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-[200px_1fr]">
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt={`VietQR thanh toán đơn ${orderCode}`}
          width={200}
          height={200}
          className="h-48 w-48 rounded-md border border-border bg-white object-contain p-1"
        />
      </div>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Ngân hàng</dt>
          <dd className="font-medium">{cfg.bankCode} — MBBank</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">STK</dt>
          <dd className="font-mono font-semibold">{cfg.accountNumber}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Tên TK</dt>
          <dd className="text-right text-xs">{cfg.accountName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Số tiền</dt>
          <dd className="font-semibold">{formatCurrencyVND(amountVnd)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Nội dung</dt>
          <dd className="font-mono text-xs">{description}</dd>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Khách quét QR → app banking tự điền sẵn. Khi tiền về STK, hệ thống tự
          đối soát qua Sepay và ghi nhận thanh toán.
        </p>
      </dl>
    </div>
  );
}
