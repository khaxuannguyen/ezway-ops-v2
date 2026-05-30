import { prisma } from "@/lib/prisma";
import type { LoginAttemptStatus } from "@/app/generated/prisma/enums";

export interface LoginAttemptRow {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  ipAddress: string | null;
  attemptedAt: Date;
  attemptCount: number;
  status: LoginAttemptStatus;
  resolvedAt: Date | null;
  resolvedBy: { id: string; name: string } | null;
}

export async function listLoginAttempts(args: {
  status?: LoginAttemptStatus;
  take?: number;
}): Promise<LoginAttemptRow[]> {
  const rows = await prisma.loginAttempt.findMany({
    where: args.status ? { status: args.status } : undefined,
    orderBy: [{ attemptedAt: "desc" }],
    take: args.take ?? 100,
    include: {
      resolvedBy: { select: { id: true, name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    picture: r.picture,
    ipAddress: r.ipAddress,
    attemptedAt: r.attemptedAt,
    attemptCount: r.attemptCount,
    status: r.status,
    resolvedAt: r.resolvedAt,
    resolvedBy: r.resolvedBy,
  }));
}

export async function getLoginAttemptById(id: string) {
  return prisma.loginAttempt.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      picture: true,
      status: true,
    },
  });
}

/** Đếm PENDING — cho badge sidebar (ADMIN). */
export async function countPendingLoginAttempts(): Promise<number> {
  return prisma.loginAttempt.count({ where: { status: "PENDING" } });
}
