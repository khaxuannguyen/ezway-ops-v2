import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, KeyRound, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getUserById } from "@/features/users/queries";
import { formatDateTime } from "@/lib/format";
import {
  USER_ROLE_LABEL,
  USER_ROLE_TONE,
  USER_ROLE_DESCRIPTION,
} from "@/lib/enum-labels";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Tài khoản",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  await requireRole("ADMIN");

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.name}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge tone={USER_ROLE_TONE[user.role]}>
              {USER_ROLE_LABEL[user.role]}
            </Badge>
            <span>{user.email}</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href="/admin/users" variant="outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {"Quay lại"}
            </LinkButton>
            <LinkButton
              href={`/admin/users/${user.id}/password`}
              variant="outline"
            >
              <KeyRound className="h-4 w-4" aria-hidden />
              {"Đặt mật khẩu"}
            </LinkButton>
            <LinkButton href={`/admin/users/${user.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden />
              {"Chỉnh sửa"}
            </LinkButton>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{"Thông tin tài khoản"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Info label={"Họ tên"}>{user.name}</Info>
            <Info label={"Email"}>{user.email}</Info>
            <Info label={"Vai trò"}>
              <Badge tone={USER_ROLE_TONE[user.role]}>
                {USER_ROLE_LABEL[user.role]}
              </Badge>
              <p className="mt-1 text-xs text-muted-foreground">
                {USER_ROLE_DESCRIPTION[user.role]}
              </p>
            </Info>
            <Info label={"Trạng thái"}>
              {user.isActive ? (
                <Badge tone="success">{"Hoạt động"}</Badge>
              ) : (
                <Badge tone="neutral">{"Đã khoá"}</Badge>
              )}
            </Info>
            <Info label={"Mật khẩu"}>
              {user.hasPassword ? (
                <Badge tone="success">{"Đã đặt"}</Badge>
              ) : (
                <Badge tone="warning">{"Chưa đặt — không đăng nhập được"}</Badge>
              )}
            </Info>
            <Info label={"Ngày tạo"}>{formatDateTime(user.createdAt)}</Info>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{"Đơn hàng đã tạo"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold tabular-nums">
              {user.orderCount.toLocaleString("vi-VN")}
            </p>
            <p className="text-xs text-muted-foreground">
              {"Số đơn do tài khoản này khởi tạo."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}
