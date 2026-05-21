import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { SupplyForm } from "@/features/supplies/components/supply-form";
import { getSupplyById } from "@/features/supplies/queries";
import { updateSupply } from "@/features/supplies/actions";

export const metadata: Metadata = {
  title: "Cập nhật vật tư",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSupplyPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getSupplyById(id);
  if (!data) notFound();
  const { supply } = data;

  const action = updateSupply.bind(null, supply.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Cập nhật vật tư" + " - " + supply.code}
        description={"Chỉnh sửa thông tin vật tư."}
        actions={
          <LinkButton href={`/admin/supplies/${supply.id}`} variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <SupplyForm
            defaults={{
              code: supply.code,
              name: supply.name,
              category: supply.category,
              unit: supply.unit,
              minStock: supply.minStock,
              notes: supply.notes,
              isActive: supply.isActive,
            }}
            action={action}
            submitLabel={"Lưu thay đổi"}
          />
        </div>
      </Card>
    </div>
  );
}
