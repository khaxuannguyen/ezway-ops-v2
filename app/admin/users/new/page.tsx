import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { UserForm } from "@/features/users/components/user-form";
import { createUser } from "@/features/users/actions";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Thêm tài khoản",
};

export default async function NewUserPage() {
  await requireRole("ADMIN");

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Thêm tài khoản"}
        description={"Tạo tài khoản đăng nhập mới và gán vai trò."}
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
          />
        </div>
      </Card>
    </div>
  );
}
