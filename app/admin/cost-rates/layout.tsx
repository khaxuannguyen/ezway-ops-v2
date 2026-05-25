import { requireRole } from "@/lib/auth";

export default async function CostRatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("ADMIN");
  return children;
}
