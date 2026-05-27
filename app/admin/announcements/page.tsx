import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent } from "@/components/ui/card";
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
import { listAnnouncementsForUser } from "@/features/announcements/queries";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thông báo",
};

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = (now - date.getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return Math.floor(diff / 60) + " phút trước";
  if (diff < 86400) return Math.floor(diff / 3600) + " giờ trước";
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + " ngày trước";
  if (diff < 86400 * 30) return Math.floor(diff / (86400 * 7)) + " tuần trước";
  if (diff < 86400 * 365) return Math.floor(diff / (86400 * 30)) + " tháng trước";
  return Math.floor(diff / (86400 * 365)) + " năm trước";
}

export default async function AnnouncementsPage() {
  const user = await requireUser();
  const rows = await listAnnouncementsForUser(user.id, user.role);
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Thông báo"}
        description={"Thông tin quan trọng từ công ty — pinned trên đầu."}
        actions={
          isAdmin ? (
            <LinkButton href="/admin/announcements/new">
              <Plus className="h-4 w-4" aria-hidden />
              {"Thông báo mới"}
            </LinkButton>
          ) : null
        }
      />

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-10">
              <EmptyState title={"Chưa có thông báo nào."} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12" />
                  <TableHead>{"Tiêu đề"}</TableHead>
                  <TableHead>{"Người đăng"}</TableHead>
                  <TableHead>{"Thời gian"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className={r.isRead ? "" : "bg-primary/5 font-medium"}
                  >
                    <TableCell>
                      <Star
                        className={
                          "h-4 w-4 " +
                          (r.isPinned
                            ? "fill-warning text-warning"
                            : "text-muted-foreground/30")
                        }
                        aria-hidden
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/announcements/${r.id}`}
                        className="text-foreground hover:text-primary hover:underline"
                      >
                        {r.title}
                      </Link>
                      {!r.isRead ? (
                        <Badge tone="primary" className="ml-2 text-[10px]">
                          {"Mới"}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.author.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span title={formatDateTime(r.publishedAt)}>
                        {timeAgo(r.publishedAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
