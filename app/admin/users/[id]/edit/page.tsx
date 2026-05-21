import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { UserForm } from "@/features/users/components/user-form";
import { getUserById } from "@/features/users/queries";
import { updateUser } from "@/features/users/actions";
import type { AssignableRole } from "@/features/users/schemas";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Cập nhật tài khoản",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: PageProps) {
  await requireRole("ADMIN");

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();

  const action = updateUser.bind(null, user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Cập nhật tài khoản - " + user.name}
        description={"Chỉnh sửa thông tin và vai trò tài khoản."}
        actions={
          <LinkButton href={`/admin/users/${user.id}`} variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <UserForm
            defaults={{
              name: user.name,
              email: user.email,
              role: user.role as AssignableRole,
              isActive: user.isActive,
            }}
            action={action}
            submitLabel={"Lưu thay đổi"}
          />
        </div>
      </Card>
    </div>
  );
}
