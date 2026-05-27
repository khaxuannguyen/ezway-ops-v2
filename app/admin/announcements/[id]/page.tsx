import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Star, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAnnouncementById } from "@/features/announcements/queries";
import {
  markAsRead,
  togglePinAnnouncement,
  deleteAnnouncement,
} from "@/features/announcements/actions";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thông báo",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Tự động link URL trong nội dung văn bản. */
function renderBody(body: string): React.ReactNode {
  const lines = body.split(/\r?\n/);
  const urlRe = /(https?:\/\/[^\s]+)/g;
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    urlRe.lastIndex = 0;
    while ((m = urlRe.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      parts.push(
        <a
          key={i + "-" + m.index}
          href={m[0]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          {m[0]}
        </a>
      );
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return (
      <div key={i} className="whitespace-pre-wrap">
        {parts.length > 0 ? parts : line || " "}
      </div>
    );
  });
}

export default async function AnnouncementDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const ann = await getAnnouncementById(id);
  if (!ann) notFound();

  // Filter visibility theo role (giống list query).
  const visibleTo = ann.visibleToRoles;
  if (visibleTo.length > 0 && !visibleTo.includes(user.role)) {
    notFound();
  }

  // Tự đánh dấu đã đọc (idempotent — không break nếu đã đọc).
  await markAsRead(ann.id);

  const isAdmin = user.role === "ADMIN";
  const annId = ann.id;
  async function togglePin() {
    "use server";
    await togglePinAnnouncement(annId);
  }
  async function del() {
    "use server";
    await deleteAnnouncement(annId);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={ann.title}
        description={
          <span className="inline-flex items-center gap-2 text-sm">
            <span>{"Người đăng:"} {ann.author.name}</span>
            <span>{"·"}</span>
            <span>{formatDateTime(ann.publishedAt)}</span>
            {ann.expiresAt ? (
              <>
                <span>{"·"}</span>
                <span className="text-warning">
                  {"Hết hạn:"} {formatDateTime(ann.expiresAt)}
                </span>
              </>
            ) : null}
            {ann.isPinned ? (
              <>
                <span>{"·"}</span>
                <Badge tone="warning">{"⭐ Pinned"}</Badge>
              </>
            ) : null}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href="/admin/announcements" variant="outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {"Quay lại"}
            </LinkButton>
            {isAdmin ? (
              <>
                <form action={togglePin}>
                  <Button type="submit" variant="outline" size="sm">
                    <Star
                      className={
                        "h-4 w-4 " +
                        (ann.isPinned ? "fill-warning text-warning" : "")
                      }
                      aria-hidden
                    />
                    {ann.isPinned ? "Bỏ ghim" : "Ghim"}
                  </Button>
                </form>
                <LinkButton
                  href={`/admin/announcements/${ann.id}/edit`}
                  variant="outline"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  {"Chỉnh sửa"}
                </LinkButton>
                <form action={del}>
                  <Button type="submit" variant="outline" size="sm">
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                    {"Xoá"}
                  </Button>
                </form>
              </>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{"Nội dung"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm leading-relaxed">
            {renderBody(ann.body)}
          </div>
        </CardContent>
      </Card>

      {isAdmin && ann.visibleToRoles.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{"Phạm vi hiển thị"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            {ann.visibleToRoles.map((r) => (
              <Badge key={r} tone="info">
                {r}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
