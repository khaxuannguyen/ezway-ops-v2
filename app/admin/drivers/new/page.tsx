import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { DriverForm } from "@/features/drivers/components/driver-form";
import { createDriver } from "@/features/drivers/actions";

export const metadata: Metadata = {
  title: "Thêm tài xế",
};

export default function NewDriverPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={"Thêm tài xế"}
        description={"Tạo hồ sơ tài xế mới."}
        actions={
          <LinkButton href="/admin/drivers" variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <DriverForm action={createDriver} submitLabel={"Thêm tài xế"} />
        </div>
      </Card>
    </div>
  );
}
