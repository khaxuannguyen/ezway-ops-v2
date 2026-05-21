import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { CostItemForm } from "@/features/cost-items/components/cost-item-form";
import { getCostItemById } from "@/features/cost-items/queries";
import { updateCostItem } from "@/features/cost-items/actions";

export const metadata: Metadata = {
  title: "Cập nhật khoản chi phí",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCostItemPage({ params }: PageProps) {
  const { id } = await params;
  const item = await getCostItemById(id);
  if (!item) notFound();

  const action = updateCostItem.bind(null, item.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Cập nhật khoản chi phí" + " - " + item.code}
        description={"Chỉnh sửa thông tin khoản chi phí."}
        actions={
          <LinkButton href={`/admin/cost-items/${item.id}`} variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <CostItemForm
            defaults={{
              code: item.code,
              name: item.name,
              category: item.category,
              pricingType: item.pricingType,
              defaultAmountVnd: item.defaultAmountVnd,
              unitLabel: item.unitLabel,
              description: item.description,
              isActive: item.isActive,
            }}
            action={action}
            submitLabel={"Lưu thay đổi"}
          />
        </div>
      </Card>
    </div>
  );
}
