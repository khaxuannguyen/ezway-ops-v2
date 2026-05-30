import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LinkButton } from "@/components/ui/link-button";
import { listLoginAttempts } from "@/features/login-attempts/queries";
import { IgnoreAttemptButton } from "@/features/login-attempts/components/ignore-button";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Yêu cầu cấp quyền" };
export const dynamic = "force-dynamic";

export default async function PendingInvitesPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/admin/dashboard");
  }

  const [pending, resolved] = await Promise.all([
    listLoginAttempts({ status: "PENDING", take: 100 }),
    listLoginAttempts({ take: 50 }).then((rs) =>
      rs.filter((r) => r.status !== "PENDING").slice(0, 30)
    ),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yêu cầu cấp quyền"
        description="Email Google đã thử đăng nhập nhưng chưa được mời. Tạo TK ngay hoặc bỏ qua nếu là spam."
      />

      <Card>
        <CardHeader>
          <CardTitle>{`Đang chờ (${pending.length})`}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Không có yêu cầu chờ xử lý." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{"Email / Tên"}</TableHead>
                  <TableHead>{"Lần thử cuối"}</TableHead>
                  <TableHead className="text-center">{"Số lần"}</TableHead>
                  <TableHead>{"IP"}</TableHead>
                  <TableHead className="text-right">{"Thao tác"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {row.picture ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.picture}
                            alt=""
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full border border-border"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                            {row.email.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <p className="font-medium">{row.email}</p>
                          {row.name ? (
                            <p className="text-xs text-muted-foreground">
                              {row.name}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(row.attemptedAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge tone={row.attemptCount > 3 ? "warning" : "neutral"}>
                        {row.attemptCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.ipAddress ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <LinkButton
                          href={`/admin/users/new?fromAttempt=${row.id}`}
                          size="sm"
                        >
                          {"Tạo TK ngay"}
                        </LinkButton>
                        <IgnoreAttemptButton id={row.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {resolved.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{"Đã xử lý gần đây"}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{"Email"}</TableHead>
                  <TableHead>{"Trạng thái"}</TableHead>
                  <TableHead>{"Xử lý lúc"}</TableHead>
                  <TableHead>{"Bởi"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolved.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="text-sm">{row.email}</p>
                      {row.name ? (
                        <p className="text-xs text-muted-foreground">
                          {row.name}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge
                        tone={
                          row.status === "INVITED" ? "success" : "neutral"
                        }
                      >
                        {row.status === "INVITED" ? "Đã tạo TK" : "Bỏ qua"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.resolvedAt ? formatDateTime(row.resolvedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.resolvedBy?.name ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
