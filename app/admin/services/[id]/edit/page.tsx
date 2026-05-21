import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { ServiceForm } from "@/features/services/components/service-form";
import { getServiceById } from "@/features/services/queries";
import { updateService } from "@/features/services/actions";

export const metadata: Metadata = {
  title: "Cập nhật dịch vụ",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditServicePage({ params }: PageProps) {
  const { id } = await params;
  const service = await getServiceById(id);
  if (!service) notFound();

  const action = updateService.bind(null, service.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Cập nhật dịch vụ" + " - " + service.code}
        description={"Chỉnh sửa thông tin dịch vụ vận chuyển."}
        actions={
          <LinkButton href={`/admin/services/${service.id}`} variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <ServiceForm
            defaults={{
              code: service.code,
              name: service.name,
              transportType: service.transportType,
              destinationCode: service.destinationCode,
              destinationName: service.destinationName,
              volumetricDivisor: service.volumetricDivisor,
              description: service.description,
              isActive: service.isActive,
            }}
            action={action}
            submitLabel={"Lưu thay đổi"}
          />
        </div>
      </Card>
    </div>
  );
}
