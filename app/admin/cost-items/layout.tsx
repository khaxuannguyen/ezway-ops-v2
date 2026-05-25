import { requireRole } from "@/lib/auth";

export default async function CostItemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("ADMIN");
  return children;
}
