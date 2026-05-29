import type { Metadata } from "next";
import Link from "next/link";
import { Package2, LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { logout } from "@/features/auth/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Tài xế · EZWAY",
    template: "%s · EZWAY",
  },
};

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user.role !== "DRIVER") {
    redirect("/admin/dashboard");
  }
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/driver" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Package2 className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm">EZWAY Tài xế</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {user.name}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                {"Đăng xuất"}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        {children}
      </main>
    </div>
  );
}
