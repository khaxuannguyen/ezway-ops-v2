import { prisma } from "@/lib/prisma";

export interface RecipientLite {
  id: string;
  contactName: string;
  companyName: string | null;
  phone: string;
  country: string | null;
  city: string | null;
  address: string | null;
  customerId: string | null;
}

/** Danh sách người nhận đã lưu — dùng cho dropdown trong form Order. Lọc theo customer nếu cần reuse trong context khách đó. */
export async function listRecipientsLite(input: {
  customerId?: string;
} = {}): Promise<RecipientLite[]> {
  return prisma.recipient.findMany({
    where: {
      deletedAt: null,
      ...(input.customerId ? { customerId: input.customerId } : {}),
    },
    select: {
      id: true,
      contactName: true,
      companyName: true,
      phone: true,
      country: true,
      city: true,
      address: true,
      customerId: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export async function getRecipientById(id: string) {
  const r = await prisma.recipient.findUnique({ where: { id } });
  if (!r || r.deletedAt) return null;
  return r;
}
