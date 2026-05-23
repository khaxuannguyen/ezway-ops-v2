import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/app/generated/prisma/enums";

export interface MyAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  image: string | null;
  hasPassword: boolean;
  hasGoogle: boolean;
  createdAt: Date;
  profile: {
    phone: string | null;
    address: string | null;
    position: string | null;
    dateOfBirth: Date | null;
    joinedAt: Date | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    nationalId: string | null;
    notes: string | null;
  } | null;
}

/** Hồ sơ + thông tin tài khoản của 1 người dùng. */
export async function getMyAccount(userId: string): Promise<MyAccount | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      passwordHash: true,
      googleId: true,
      createdAt: true,
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
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image,
    hasPassword: Boolean(user.passwordHash),
    hasGoogle: Boolean(user.googleId),
    createdAt: user.createdAt,
    profile: user.profile,
  };
}
