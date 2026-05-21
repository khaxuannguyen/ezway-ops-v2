import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { CostRateBulkForm } from "@/features/cost-rates/components/cost-rate-bulk-form";
import { replaceCostRates } from "@/features/cost-rates/actions";
import {
  getServiceCostTable,
  listServicesLiteForCostRate,
} from "@/features/cost-rates/queries";
import {
  STANDARD_FIXED_WEIGHTS,
  STANDARD_PERKG_RANGES,
} from "@/features/cost-rates/constants";

export const metadata: Metadata = {
  title: "Sửa toàn bộ bảng giá",
};

function toDateInput(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return undefined;
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return dt.getFullYear() + "-" + mm + "-" + dd;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCostTablePage({ params }: PageProps) {
  const { id } = await params;
  const [data, services] = await Promise.all([
    getServiceCostTable(id),
    listServicesLiteForCostRate(),
  ]);
  if (!data) notFound();
  const { service, fixedRates, perKgRates } = data;

  const firstRate = fixedRates[0] ?? perKgRates[0];

  // Map existing rates onto the fixed standard scale, by weight.
  const fixedPrices = STANDARD_FIXED_WEIGHTS.map((w) => {
    const r = fixedRates.find((x) => Number(x.minWeightKg) === w);
    return r ? String(r.amountVnd) : "";
  });
  const perKgPrices = STANDARD_PERKG_RANGES.map((rg) => {
    const r = perKgRates.find(
      (x) =>
        Number(x.minWeightKg) === rg.min && Number(x.maxWeightKg) === rg.max
    );
    return r ? String(r.amountVnd) : "";
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Sửa toàn bộ bảng giá" + " - " + service.code}
        description={"Chỉnh sửa tất cả mốc và bậc giá. Lưu sẽ thay thế toàn bộ bảng giá hiện tại của dịch vụ."}
        actions={
          <LinkButton href={`/admin/cost-rates/${service.id}`} variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <CostRateBulkForm
            services={services}
            defaultServiceId={service.id}
            lockService
            defaults={{
              validFrom: toDateInput(firstRate?.validFrom),
              validTo: toDateInput(firstRate?.validTo),
              fixedPrices,
              perKgPrices,
            }}
            action={replaceCostRates}
            submitLabel={"Lưu toàn bộ"}
          />
        </div>
      </Card>
    </div>
  );
}
