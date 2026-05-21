import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { CostRateBulkForm } from "@/features/cost-rates/components/cost-rate-bulk-form";
import { createCostRatesBulk } from "@/features/cost-rates/actions";
import { listServicesLiteForCostRate } from "@/features/cost-rates/queries";

export const metadata: Metadata = {
  title: "Tạo bảng giá",
};

interface PageProps {
  searchParams: Promise<{ serviceId?: string }>;
}

export default async function NewCostRatePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const services = await listServicesLiteForCostRate();

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Tạo bảng giá"}
        description={"Nhập nhiều mốc và bậc giá cho một dịch vụ cùng lúc."}
        actions={
          <LinkButton href="/admin/cost-rates" variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <CostRateBulkForm
            services={services}
            defaultServiceId={sp.serviceId}
            lockService={Boolean(sp.serviceId)}
            action={createCostRatesBulk}
            submitLabel={"Lưu bảng giá"}
          />
        </div>
      </Card>
    </div>
  );
}
