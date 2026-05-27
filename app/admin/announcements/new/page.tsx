import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { AnnouncementForm } from "@/features/announcements/components/announcement-form";
import { createAnnouncement } from "@/features/announcements/actions";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thông báo mới",
};

export default async function NewAnnouncementPage() {
  await requireRole("ADMIN");

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Thông báo mới"}
        description={"Đăng thông báo gửi nhân viên theo role."}
        actions={
          <LinkButton href="/admin/announcements" variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <AnnouncementForm
            action={createAnnouncement}
            submitLabel={"Đăng thông báo"}
          />
        </div>
      </Card>
    </div>
  );
}
