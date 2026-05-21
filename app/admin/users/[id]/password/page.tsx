import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { PasswordForm } from "@/features/users/components/password-form";
import { getUserById } from "@/features/users/queries";
import { setUserPassword } from "@/features/users/actions";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Đặt mật khẩu",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserPasswordPage({ params }: PageProps) {
  await requireRole("ADMIN");

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();

  const action = setUserPassword.bind(null, user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Đặt mật khẩu - " + user.name}
        description={"Đặt hoặc khôi phục mật khẩu đăng nhập cho tài khoản này."}
        actions={
          <LinkButton href={`/admin/users/${user.id}`} variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <PasswordForm action={action} />
        </div>
      </Card>
    </div>
  );
}
