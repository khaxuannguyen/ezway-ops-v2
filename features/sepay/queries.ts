import { prisma } from "@/lib/prisma";
import type { SepayMatchStatus } from "@/app/generated/prisma/enums";

export interface SepayTransactionRow {
  id: string;
  sepayId: string;
  accountNumber: string;
  bankBrandName: string | null;
  transferType: string;
  amountVnd: number;
  content: string;
  referenceCode: string | null;
  transactionDate: Date;
  receivedAt: Date;
  matchStatus: SepayMatchStatus;
  matchNotes: string | null;
  matchedOrder: { id: string; code: string } | null;
  payment: { id: string } | null;
}

function toRow(r: {
  id: string;
  sepayId: bigint;
  accountNumber: string;
  bankBrandName: string | null;
  transferType: string;
  amountVnd: number;
  content: string;
  referenceCode: string | null;
  transactionDate: Date;
  receivedAt: Date;
  matchStatus: SepayMatchStatus;
  matchNotes: string | null;
  matchedOrder: { id: string; code: string } | null;
  payment: { id: string } | null;
}): SepayTransactionRow {
  return {
    id: r.id,
    sepayId: r.sepayId.toString(),
    accountNumber: r.accountNumber,
    bankBrandName: r.bankBrandName,
    transferType: r.transferType,
    amountVnd: r.amountVnd,
    content: r.content,
    referenceCode: r.referenceCode,
    transactionDate: r.transactionDate,
    receivedAt: r.receivedAt,
    matchStatus: r.matchStatus,
    matchNotes: r.matchNotes,
    matchedOrder: r.matchedOrder,
    payment: r.payment,
  };
}

export async function listSepayTransactions(args: {
  status?: SepayMatchStatus | SepayMatchStatus[];
  take?: number;
}): Promise<SepayTransactionRow[]> {
  const where = args.status
    ? Array.isArray(args.status)
      ? { matchStatus: { in: args.status } }
      : { matchStatus: args.status }
    : undefined;
  const rows = await prisma.sepayTransaction.findMany({
    where,
    orderBy: [{ receivedAt: "desc" }],
    take: args.take ?? 100,
    include: {
      matchedOrder: { select: { id: true, code: true } },
      payment: { select: { id: true } },
    },
  });
  return rows.map(toRow);
}

export async function listSepayTransactionsByOrder(
  orderId: string
): Promise<SepayTransactionRow[]> {
  const rows = await prisma.sepayTransaction.findMany({
    where: { matchedOrderId: orderId },
    orderBy: [{ transactionDate: "desc" }],
    include: {
      matchedOrder: { select: { id: true, code: true } },
      payment: { select: { id: true } },
    },
  });
  return rows.map(toRow);
}

/** Đếm số giao dịch cần admin xử lý (UNMATCHED + AMBIGUOUS) — sidebar badge. */
export async function countSepayPending(): Promise<number> {
  return prisma.sepayTransaction.count({
    where: { matchStatus: { in: ["UNMATCHED", "AMBIGUOUS"] } },
  });
}
