import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import type { PaymentStatus, OrderStatus } from "@/app/generated/prisma/enums";
import { extractOrderCodes } from "./match";
import type { SepayWebhookPayload } from "./types";

/**
 * Xử lý 1 webhook Sepay → ghi SepayTransaction + match Order + tạo Payment auto.
 *
 *  - Idempotent qua sepayId UNIQUE: webhook retry trả về kết quả lần đầu
 *  - transferType=out → vẫn ghi log (audit), KHÔNG match
 *  - transferAmount<=0 → ignore
 *  - content không có mã đơn → UNMATCHED
 *  - 1 mã đơn duy nhất → MATCHED + tạo Payment auto. Sync paidVnd / status Order
 *  - >1 mã đơn → AMBIGUOUS (admin manual chọn)
 */
export interface ProcessResult {
  id: string;
  status: "PENDING" | "MATCHED" | "UNMATCHED" | "AMBIGUOUS" | "IGNORED";
  alreadyProcessed: boolean;
  paymentId: string | null;
  orderId: string | null;
  message: string;
}

async function syncOrderPaymentTotals(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<void> {
  const [agg, order] = await Promise.all([
    tx.payment.aggregate({ where: { orderId }, _sum: { amountVnd: true } }),
    tx.order.findUnique({
      where: { id: orderId },
      select: { totalFeeVnd: true, status: true },
    }),
  ]);
  if (!order) return;
  const paidVnd = agg._sum.amountVnd ?? 0;
  let paymentStatus: PaymentStatus;
  if (paidVnd <= 0) paymentStatus = "UNPAID";
  else if (paidVnd < order.totalFeeVnd) paymentStatus = "PARTIAL";
  else paymentStatus = "PAID";
  let nextStatus: OrderStatus = order.status;
  if (paymentStatus === "PAID" && order.status === "DELIVERED") {
    nextStatus = "CLOSED";
  }
  await tx.order.update({
    where: { id: orderId },
    data: { paidVnd, paymentStatus, status: nextStatus },
  });
}

/** Hệ thống user dùng làm `recordedById` cho Payment auto. */
const SYSTEM_USER_EMAIL = "system.sepay@ezway.local";

async function ensureSystemUser(
  tx: Prisma.TransactionClient
): Promise<{ id: string }> {
  const existing = await tx.user.findUnique({
    where: { email: SYSTEM_USER_EMAIL },
    select: { id: true },
  });
  if (existing) return existing;
  const created = await tx.user.create({
    data: {
      email: SYSTEM_USER_EMAIL,
      name: "Sepay (bot)",
      role: "ADMIN",
      isActive: false,
      passwordHash: null,
    },
    select: { id: true },
  });
  return created;
}

export async function processSepayWebhook(
  payload: SepayWebhookPayload
): Promise<ProcessResult> {
  // Idempotency check trước.
  const dup = await prisma.sepayTransaction.findUnique({
    where: { sepayId: BigInt(payload.id) },
    select: {
      id: true,
      matchStatus: true,
      payment: { select: { id: true } },
      matchedOrderId: true,
    },
  });
  if (dup) {
    return {
      id: dup.id,
      status: dup.matchStatus,
      alreadyProcessed: true,
      paymentId: dup.payment?.id ?? null,
      orderId: dup.matchedOrderId,
      message: "Webhook đã xử lý trước đó (idempotent).",
    };
  }

  const transactionDate = new Date(payload.transactionDate);

  // Ignore: not IN hoặc amount<=0.
  if (payload.transferType !== "in" || payload.transferAmount <= 0) {
    const created = await prisma.sepayTransaction.create({
      data: {
        sepayId: BigInt(payload.id),
        accountNumber: payload.accountNumber,
        bankBrandName: payload.gateway,
        transferType: payload.transferType,
        amountVnd: payload.transferAmount,
        content: payload.content ?? "",
        referenceCode: payload.referenceCode,
        transactionDate,
        matchStatus: "IGNORED",
        matchNotes: "Bỏ qua (out hoặc amount<=0)",
        matchedAt: new Date(),
        rawPayload: payload as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    return {
      id: created.id,
      status: "IGNORED",
      alreadyProcessed: false,
      paymentId: null,
      orderId: null,
      message: "Bỏ qua: giao dịch không phải IN hoặc amount<=0.",
    };
  }

  // Trích Order.code từ content + description.
  const memo = `${payload.content ?? ""} ${payload.description ?? ""}`.trim();
  const candidates = extractOrderCodes(memo);

  if (candidates.length === 0) {
    const created = await prisma.sepayTransaction.create({
      data: {
        sepayId: BigInt(payload.id),
        accountNumber: payload.accountNumber,
        bankBrandName: payload.gateway,
        transferType: payload.transferType,
        amountVnd: payload.transferAmount,
        content: payload.content ?? "",
        referenceCode: payload.referenceCode,
        transactionDate,
        matchStatus: "UNMATCHED",
        matchNotes: "Không tìm thấy mã đơn EZW trong content",
        rawPayload: payload as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    return {
      id: created.id,
      status: "UNMATCHED",
      alreadyProcessed: false,
      paymentId: null,
      orderId: null,
      message: "Không match được mã đơn — admin chọn tay.",
    };
  }

  // Tra DB tìm Order tương ứng.
  const orderCodes = candidates.map((c) => c.canonical);
  const orders = await prisma.order.findMany({
    where: { code: { in: orderCodes }, deletedAt: null },
    select: { id: true, code: true },
  });

  if (orders.length === 0) {
    const created = await prisma.sepayTransaction.create({
      data: {
        sepayId: BigInt(payload.id),
        accountNumber: payload.accountNumber,
        bankBrandName: payload.gateway,
        transferType: payload.transferType,
        amountVnd: payload.transferAmount,
        content: payload.content ?? "",
        referenceCode: payload.referenceCode,
        transactionDate,
        matchStatus: "UNMATCHED",
        matchNotes: `Tìm được mã trong memo (${orderCodes.join(", ")}) nhưng không có Order tương ứng`,
        rawPayload: payload as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    return {
      id: created.id,
      status: "UNMATCHED",
      alreadyProcessed: false,
      paymentId: null,
      orderId: null,
      message: "Mã đơn không tồn tại trong hệ thống.",
    };
  }

  if (orders.length > 1) {
    const created = await prisma.sepayTransaction.create({
      data: {
        sepayId: BigInt(payload.id),
        accountNumber: payload.accountNumber,
        bankBrandName: payload.gateway,
        transferType: payload.transferType,
        amountVnd: payload.transferAmount,
        content: payload.content ?? "",
        referenceCode: payload.referenceCode,
        transactionDate,
        matchStatus: "AMBIGUOUS",
        matchNotes: `Memo chứa nhiều mã đơn: ${orders.map((o) => o.code).join(", ")}`,
        rawPayload: payload as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    return {
      id: created.id,
      status: "AMBIGUOUS",
      alreadyProcessed: false,
      paymentId: null,
      orderId: null,
      message: "Memo chứa nhiều mã đơn — admin chọn tay.",
    };
  }

  // 1 match duy nhất → MATCHED + tạo Payment auto.
  const order = orders[0];
  const result = await prisma.$transaction(async (tx) => {
    const system = await ensureSystemUser(tx);
    const sepayTx = await tx.sepayTransaction.create({
      data: {
        sepayId: BigInt(payload.id),
        accountNumber: payload.accountNumber,
        bankBrandName: payload.gateway,
        transferType: payload.transferType,
        amountVnd: payload.transferAmount,
        content: payload.content ?? "",
        referenceCode: payload.referenceCode,
        transactionDate,
        matchStatus: "MATCHED",
        matchedOrderId: order.id,
        matchedAt: new Date(),
        matchNotes: `Auto match từ memo: ${candidates[0].raw}`,
        rawPayload: payload as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        amountVnd: payload.transferAmount,
        method: "BANK_TRANSFER",
        paidAt: transactionDate,
        reference: payload.referenceCode ?? null,
        notes: `Tự động từ Sepay (${payload.gateway}). Memo: ${payload.content}`,
        recordedById: system.id,
        sepayTransactionId: sepayTx.id,
      },
      select: { id: true },
    });
    await syncOrderPaymentTotals(tx, order.id);
    return { sepayTxId: sepayTx.id, paymentId: payment.id };
  });

  return {
    id: result.sepayTxId,
    status: "MATCHED",
    alreadyProcessed: false,
    paymentId: result.paymentId,
    orderId: order.id,
    message: `Match thành công đơn ${order.code}, đã tạo Payment.`,
  };
}
