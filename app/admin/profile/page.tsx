import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { PasswordChangeForm } from "@/features/profile/components/password-change-form";
import { getMyAccount } from "@/features/profile/queries";
import { requireUser } from "@/lib/auth";
import { USER_ROLE_LABEL } from "@/lib/enum-labels";

export const metadata: Metadata = {
  title: "Tài khoản của tôi",
};

function dateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function ProfilePage() {
  const user = await requireUser();
  const account = await getMyAccount(user.id);
  if (!account) redirect("/login");

  const p = account.profile;
  const defaults = {
    name: account.name,
    phone: p?.phone ?? "",
    address: p?.address ?? "",
    position: p?.position ?? "",
    dateOfBirth: dateInput(p?.dateOfBirth ?? null),
    joinedAt: dateInput(p?.joinedAt ?? null),
    emergencyContactName: p?.emergencyContactName ?? "",
    emergencyContactPhone: p?.emergencyContactPhone ?? "",
    nationalId: p?.nationalId ?? "",
    notes: p?.notes ?? "",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Tài khoản của tôi"}
        description={"Xem và cập nhật thông tin cá nhân của bạn."}
      />

      <Card>
        <div className="px-6 pb-6">
          <ProfileForm
            email={account.email}
            roleLabel={USER_ROLE_LABEL[account.role]}
            defaults={defaults}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{"Bảo mật"}</CardTitle>
          <CardDescription>
            {account.hasPassword
              ? "Đổi mật khẩu đăng nhập của bạn."
              : "Phương thức đăng nhập của tài khoản."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {account.hasPassword ? (
            <PasswordChangeForm />
          ) : (
            <p className="text-sm text-muted-foreground">
              {"Tài khoản này đăng nhập bằng Google — không dùng mật khẩu."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
