import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { SupplyForm } from "@/features/supplies/components/supply-form";
import { createSupply } from "@/features/supplies/actions";

export const metadata: Metadata = {
  title: "Thêm vật tư",
};

export default function NewSupplyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={"Thêm vật tư"}
        description={"Tạo vật tư mới trong kho."}
        actions={
          <LinkButton href="/admin/supplies" variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <SupplyForm action={createSupply} submitLabel={"Thêm vật tư"} isNew />
        </div>
      </Card>
    </div>
  );
}
