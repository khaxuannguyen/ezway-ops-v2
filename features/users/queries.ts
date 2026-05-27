import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PAGE_SIZE,
  buildPageMeta,
  type PageMeta,
} from "@/lib/pagination";
import type { UserRole } from "@/app/generated/prisma/enums";

/** Role được module Tài khoản quản lý — loại trừ DRIVER. */
const MANAGED_ROLES: UserRole[] = ["ADMIN", "STAFF", "SALE"];

export interface ListUsersInput {
  q?: string;
  role?: UserRole;
  page?: number;
  pageSize?: number;
}

export interface UserListRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  hasPassword: boolean;
  hasGoogle: boolean;
  orderCount: number;
  createdAt: Date;
}

export interface UserListResult {
  rows: UserListRow[];
  meta: PageMeta;
}

export async function listUsers(
  input: ListUsersInput = {}
): Promise<UserListResult> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const q = (input.q ?? "").trim();

  const where = {
    role:
      input.role && MANAGED_ROLES.includes(input.role)
        ? input.role
        : { in: MANAGED_ROLES },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        passwordHash: true,
        googleId: true,
        createdAt: true,
        _count: { select: { ordersCreated: true } },
      },
    }),
  ]);

  return {
    rows: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      hasPassword: Boolean(u.passwordHash),
      hasGoogle: Boolean(u.googleId),
      orderCount: u._count.ordersCreated,
      createdAt: u.createdAt,
    })),
    meta: buildPageMeta(total, page, pageSize),
  };
}

/** Danh sách nhân viên sale đang hoạt động — dùng cho ô chọn ở form đơn hàng. */
export async function listSalesUsersLite(): Promise<
  { id: string; name: string }[]
> {
  return prisma.user.findMany({
    where: { role: "SALE", isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Danh sách nhân viên OPS (STAFF + DRIVER) đang hoạt động — dùng cho ô chọn
 * "Người phụ trách" trong form đơn hàng (NV đóng hàng / tài xế hỗ trợ).
 */
export async function listOpsUsersLite(): Promise<
  { id: string; name: string; role: UserRole }[]
> {
  return prisma.user.findMany({
    where: { role: { in: ["STAFF", "DRIVER"] }, isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

/** Lấy 1 tài khoản. Trả null nếu là tài xế (quản lý ở module Tài xế). */
export async function getUserById(id: string) {
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
      googleId: true,
      createdAt: true,
      _count: { select: { ordersCreated: true } },
      profile: {
        select: {
          phone: true,
          address: true,
          position: true,
          dateOfBirth: true,
          joinedAt: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          nationalId: true,
          notes: true,
        },
      },
    },
  });
  if (!u || u.role === "DRIVER") return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    hasPassword: Boolean(u.passwordHash),
    hasGoogle: Boolean(u.googleId),
    orderCount: u._count.ordersCreated,
    createdAt: u.createdAt,
    profile: u.profile,
  };
}
