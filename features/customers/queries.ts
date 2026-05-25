import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PAGE_SIZE,
  buildPageMeta,
  type PageMeta,
} from "@/lib/pagination";

export interface ListCustomersInput {
  q?: string;
  /** Lọc theo sale phụ trách (dùng cho góc nhìn SALE — chỉ khách của mình). */
  salesUserId?: string;
  page?: number;
  pageSize?: number;
}

export interface CustomerListRow {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  isBusiness: boolean;
  orderCount: number;
  createdAt: Date;
  salesUser: { id: string; name: string } | null;
}

export interface CustomerListResult {
  rows: CustomerListRow[];
  meta: PageMeta;
}

export async function listCustomers(
  input: ListCustomersInput = {}
): Promise<CustomerListResult> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const q = (input.q ?? "").trim();

  const where = {
    deletedAt: null,
    ...(input.salesUserId ? { salesUserId: input.salesUserId } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { orders: true } },
        salesUser: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    rows: rows.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      isBusiness: c.isBusiness,
      orderCount: c._count.orders,
      createdAt: c.createdAt,
      salesUser: c.salesUser,
    })),
    meta: buildPageMeta(total, page, pageSize),
  };
}

/** Form đơn hàng dùng cái này. SALE truyền salesUserId = mình để chỉ thấy khách của mình. */
export async function listAllCustomersLite(salesUserId?: string) {
  const rows = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      ...(salesUserId ? { salesUserId } : {}),
    },
    select: { id: true, code: true, name: true, phone: true },
    orderBy: { code: "asc" },
  });
  return rows;
}

export async function getCustomerById(id: string) {
  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      _count: { select: { orders: true } },
      salesUser: { select: { id: true, name: true } },
    },
  });
  if (!c || c.deletedAt) return null;
  return c;
}

export async function getCustomerWithOrders(id: string) {
  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          code: true,
          status: true,
          totalFeeVnd: true,
          paidVnd: true,
          paymentStatus: true,
          createdAt: true,
          service: { select: { code: true, name: true } },
        },
      },
      _count: { select: { orders: true } },
      salesUser: { select: { id: true, name: true } },
    },
  });
  if (!c || c.deletedAt) return null;
  return c;
}
