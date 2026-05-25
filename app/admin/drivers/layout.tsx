import { requireRole } from "@/lib/auth";

export default async function DriversLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("ADMIN", "STAFF");
  return children;
}
