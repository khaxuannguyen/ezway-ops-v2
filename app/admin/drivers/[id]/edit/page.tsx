import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { DriverForm } from "@/features/drivers/components/driver-form";
import { getDriverById } from "@/features/drivers/queries";
import { updateDriver } from "@/features/drivers/actions";

export const metadata: Metadata = {
  title: "Cập nhật tài xế",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDriverPage({ params }: PageProps) {
  const { id } = await params;
  const driver = await getDriverById(id);
  if (!driver) notFound();

  const action = updateDriver.bind(null, driver.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Cập nhật tài xế" + " - " + driver.user.name}
        description={"Chỉnh sửa thông tin tài xế."}
        actions={
          <LinkButton href={`/admin/drivers/${driver.id}`} variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <DriverForm
            defaults={{
              name: driver.user.name,
              email: driver.user.email,
              phone: driver.phone,
              vehicleType: driver.vehicleType,
              vehiclePlate: driver.vehiclePlate,
              isActive: driver.isActive,
            }}
            action={action}
            submitLabel={"Lưu thay đổi"}
          />
        </div>
      </Card>
    </div>
  );
}
