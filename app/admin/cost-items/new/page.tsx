import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { CostItemForm } from "@/features/cost-items/components/cost-item-form";
import { createCostItem } from "@/features/cost-items/actions";

export const metadata: Metadata = {
  title: "Tạo khoản chi phí",
};

export default function NewCostItemPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={"Tạo khoản chi phí"}
        description={"Thêm khoản chi phí mới vào danh mục."}
        actions={
          <LinkButton href="/admin/cost-items" variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <CostItemForm action={createCostItem} submitLabel={"Tạo khoản chi phí"} />
        </div>
      </Card>
    </div>
  );
}
