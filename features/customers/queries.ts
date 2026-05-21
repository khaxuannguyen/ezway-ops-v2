import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PAGE_SIZE,
  buildPageMeta,
  type PageMeta,
} from "@/lib/pagination";

export interface ListCustomersInput {
  q?: string;
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
      include: { _count: { select: { orders: true } } },
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
    })),
    meta: buildPageMeta(total, page, pageSize),
  };
}

export async function listAllCustomersLite() {
  const rows = await prisma.customer.findMany({
    where: { deletedAt: null },
    select: { id: true, code: true, name: true, phone: true },
    orderBy: { code: "asc" },
  });
  return rows;
}

export async function getCustomerById(id: string) {
  const c = await prisma.customer.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
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
          createdAt: true,
          service: { select: { code: true, name: true } },
        },
      },
      _count: { select: { orders: true } },
    },
  });
  if (!c || c.deletedAt) return null;
  return c;
}
