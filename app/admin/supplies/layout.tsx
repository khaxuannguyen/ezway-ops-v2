import { requireRole } from "@/lib/auth";

export default async function SuppliesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("ADMIN", "STAFF");
  return children;
}
