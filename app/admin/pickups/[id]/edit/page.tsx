import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { PickupForm } from "@/features/pickups/components/pickup-form";
import {
  getPickupById,
  listOrdersWithoutPickup,
  listDriversLiteForPickup,
} from "@/features/pickups/queries";
import { updatePickup } from "@/features/pickups/actions";

export const metadata: Metadata = {
  title: "Cập nhật lệnh lấy hàng",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPickupPage({ params }: PageProps) {
  const { id } = await params;
  const pickup = await getPickupById(id);
  if (!pickup) notFound();

  const [orders, drivers] = await Promise.all([
    listOrdersWithoutPickup(pickup.order.id),
    listDriversLiteForPickup(),
  ]);

  const action = updatePickup.bind(null, pickup.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Cập nhật lệnh lấy hàng" + " - " + pickup.order.code}
        description={"Chỉnh sửa thông tin lệnh lấy hàng."}
        actions={
          <LinkButton href={`/admin/pickups/${pickup.id}`} variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <PickupForm
            orders={orders}
            drivers={drivers}
            lockOrder
            defaults={{
              orderId: pickup.order.id,
              driverId: pickup.driver?.id ?? "",
              pickupAddress: pickup.pickupAddress,
              pickupContactName: pickup.pickupContactName,
              pickupContactPhone: pickup.pickupContactPhone,
              scheduledAt: pickup.scheduledAt,
              notes: pickup.notes,
              currentStatus: pickup.currentStatus,
            }}
            action={action}
            submitLabel={"Lưu thay đổi"}
          />
        </div>
      </Card>
    </div>
  );
}
