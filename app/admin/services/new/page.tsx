import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { ServiceForm } from "@/features/services/components/service-form";
import { createService } from "@/features/services/actions";

export const metadata: Metadata = {
  title: "Tạo dịch vụ",
};

export default function NewServicePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={"Tạo dịch vụ"}
        description={"Thêm dịch vụ vận chuyển mới vào danh mục."}
        actions={
          <LinkButton href="/admin/services" variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <ServiceForm action={createService} submitLabel={"Tạo dịch vụ"} />
        </div>
      </Card>
    </div>
  );
}
