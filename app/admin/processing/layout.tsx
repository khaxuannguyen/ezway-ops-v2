import { requireRole } from "@/lib/auth";

export default async function ProcessingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("ADMIN", "STAFF");
  return children;
}
