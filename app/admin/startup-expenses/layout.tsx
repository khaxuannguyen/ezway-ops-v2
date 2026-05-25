import { requireRole } from "@/lib/auth";

export default async function StartupExpensesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("ADMIN");
  return children;
}
