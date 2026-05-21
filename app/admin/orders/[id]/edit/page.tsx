import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { OrderForm } from "@/features/orders/components/order-form";
import { updateOrder } from "@/features/orders/actions";
import {
  getOrderById,
  listAllServicesLite,
} from "@/features/orders/queries";
import { listAllCustomersLite } from "@/features/customers/queries";

export const metadata: Metadata = {
  title: "Cập nhật đơn hàng",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditOrderPage({ params }: PageProps) {
  const { id } = await params;
  const [order, customers, services] = await Promise.all([
    getOrderById(id),
    listAllCustomersLite(),
    listAllServicesLite(),
  ]);
  if (!order) notFound();

  const action = updateOrder.bind(null, order.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${"Cập nhật đơn hàng"} - ${order.code}`}
        description={"Chỉnh sửa thông tin đơn hàng."}
        actions={
          <LinkButton href={`/admin/orders/${order.id}`} variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <OrderForm
            customers={customers}
            services={services}
            defaults={{
              customerId: order.customerId,
              serviceId: order.serviceId,
              chargeableWeightKg: order.chargeableWeightKg.toString(),
              customerFeeVnd: order.totalFeeVnd,
              status: order.status,
              pickupMethod: order.pickupMethod,
              notes: order.notes,
            }}
            action={action}
            submitLabel={"Lưu thay đổi"}
          />
        </div>
      </Card>
    </div>
  );
}
