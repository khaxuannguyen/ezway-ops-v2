import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { UserForm } from "@/features/users/components/user-form";
import { createUser } from "@/features/users/actions";
import { getLoginAttemptById } from "@/features/login-attempts/queries";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Thêm tài khoản",
};

interface PageProps {
  searchParams: Promise<{ fromAttempt?: string }>;
}

export default async function NewUserPage({ searchParams }: PageProps) {
  await requireRole("ADMIN");

  const sp = await searchParams;
  const attempt = sp.fromAttempt
    ? await getLoginAttemptById(sp.fromAttempt)
    : null;
  const prefill = attempt && attempt.status === "PENDING"
    ? { name: attempt.name ?? "", email: attempt.email }
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Thêm tài khoản"}
        description={
          attempt && attempt.status === "PENDING"
            ? `Tạo tài khoản từ yêu cầu cấp quyền của ${attempt.email}.`
            : "Tạo tài khoản đăng nhập mới và gán vai trò."
        }
        actions={
          <LinkButton href="/admin/users" variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <UserForm
            action={createUser}
            submitLabel={"Thêm tài khoản"}
            withPassword
            defaults={prefill}
            fromAttemptId={attempt && attempt.status === "PENDING" ? attempt.id : undefined}
          />
        </div>
      </Card>
    </div>
  );
}
