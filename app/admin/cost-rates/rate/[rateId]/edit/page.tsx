import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { CostRateForm } from "@/features/cost-rates/components/cost-rate-form";
import {
  getCostRateById,
  listServicesLiteForCostRate,
} from "@/features/cost-rates/queries";
import { updateCostRate } from "@/features/cost-rates/actions";

export const metadata: Metadata = {
  title: "Cập nhật bậc giá",
};

interface PageProps {
  params: Promise<{ rateId: string }>;
}

export default async function EditCostRatePage({ params }: PageProps) {
  const { rateId } = await params;
  const [rate, services] = await Promise.all([
    getCostRateById(rateId),
    listServicesLiteForCostRate(),
  ]);
  if (!rate) notFound();

  const action = updateCostRate.bind(null, rate.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Cập nhật bậc giá"}
        description={"Chỉnh sửa một dòng giá."}
        actions={
          <LinkButton href={`/admin/cost-rates/${rate.service.id}`} variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <CostRateForm
            services={services}
            defaults={{
              serviceId: rate.service.id,
              minWeightKg: rate.minWeightKg.toString(),
              maxWeightKg: rate.maxWeightKg.toString(),
              rateType: rate.rateType,
              amountVnd: rate.amountVnd,
              validFrom: rate.validFrom,
              validTo: rate.validTo,
              notes: rate.notes,
            }}
            action={action}
            submitLabel={"Lưu thay đổi"}
          />
        </div>
      </Card>
    </div>
  );
}
