// Tien ich CLI: dat / khoi phuc mat khau cho mot tai khoan.
// Chay: npx tsx prisma/set-password.ts <email> <password>
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client";

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: npx tsx prisma/set-password.ts <email> <password>");
  process.exit(1);
}
if (password.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("Thieu DATABASE_URL trong .env.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { passwordHash: hash },
    select: { email: true, name: true, role: true },
  });
  console.log(`OK — password set for ${user.email} (${user.name}, ${user.role}).`);
}

main()
  .catch((e) => {
    console.error("FAILED:", e.message ?? e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
