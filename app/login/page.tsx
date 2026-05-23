import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Package2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { buttonClasses } from "@/components/ui/button";
import { LoginForm } from "@/features/auth/components/login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đăng nhập",
};

const ERROR_MESSAGES: Record<string, string> = {
  oauth: "Đăng nhập Google thất bại. Vui lòng thử lại.",
  oauth_disabled: "Đăng nhập Google chưa được cấu hình.",
  unverified: "Email Google chưa được xác minh. Hãy dùng email khác.",
  notinvited: "Tài khoản chưa được cấp quyền. Liên hệ quản trị viên.",
  locked: "Tài khoản đã bị khoá. Liên hệ quản trị viên.",
};

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/admin/dashboard");

  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;
  const googleEnabled = isGoogleAuthConfigured();

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

        <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {googleEnabled ? (
            <>
              <a
                href="/api/auth/google"
                className={buttonClasses({
                  variant: "outline",
                  className: "w-full",
                })}
              >
                <GoogleIcon />
                {"Đăng nhập với Google"}
              </a>
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">
                  {"hoặc dùng email"}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          ) : null}

          <LoginForm />
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          EZWAY Ops v2 · Phiên bản nội bộ
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
