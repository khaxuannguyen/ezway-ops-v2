import { requireRole } from "@/lib/auth";

export default async function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("ADMIN");
  return children;
}
