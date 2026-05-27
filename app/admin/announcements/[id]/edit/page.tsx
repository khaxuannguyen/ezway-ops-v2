import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { AnnouncementForm } from "@/features/announcements/components/announcement-form";
import { updateAnnouncement } from "@/features/announcements/actions";
import { getAnnouncementById } from "@/features/announcements/queries";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sửa thông báo",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAnnouncementPage({ params }: PageProps) {
  await requireRole("ADMIN");
  const { id } = await params;
  const ann = await getAnnouncementById(id);
  if (!ann) notFound();

  const action = updateAnnouncement.bind(null, ann.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Sửa thông báo"}
        description={ann.title}
        actions={
          <LinkButton href={`/admin/announcements/${ann.id}`} variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <AnnouncementForm
            defaults={{
              title: ann.title,
              body: ann.body,
              isPinned: ann.isPinned,
              visibleToRoles: ann.visibleToRoles,
              expiresAt: ann.expiresAt?.toISOString() ?? null,
            }}
            action={action}
            submitLabel={"Lưu thay đổi"}
          />
        </div>
      </Card>
    </div>
  );
}
