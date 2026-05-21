import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Package2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/features/auth/components/login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đăng nhập",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/admin/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Package2 className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            EZWAY Ops
          </h1>
          <p className="text-sm text-muted-foreground">
            Đăng nhập để vào hệ thống quản trị vận hành.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          EZWAY Ops v2 · Phiên bản nội bộ
        </p>
      </div>
    </main>
  );
}
