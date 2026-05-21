import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "admin@ezway.local";

let cachedId: string | null = null;

export async function getActorUserId(): Promise<string> {
  if (cachedId) return cachedId;
  const user = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });
  if (!user) {
    throw new Error(
      "Khong tim thay user admin@ezway.local. Hay chay `npx prisma db seed`."
    );
  }
  cachedId = user.id;
  return cachedId;
}
