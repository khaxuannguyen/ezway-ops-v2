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
import { listSalesUsersLite } from "@/features/users/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Cập nhật đơn hàng",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditOrderPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const [order, customers, services, salesUsers] = await Promise.all([
    getOrderById(id),
    listAllCustomersLite(),
    listAllServicesLite(),
    listSalesUsersLite(),
  ]);
  if (!order) notFound();
  // SALE chỉ được sửa đơn của chính mình.
  if (user.role === "SALE" && order.salesUserId !== user.id) notFound();

  const action = updateOrder.bind(null, order.id);
  const lockedSalesUser =
    user.role === "SALE" ? { id: user.id, name: user.name } : null;

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
            salesUsers={salesUsers}
            lockedSalesUser={lockedSalesUser}
            defaults={{
              customerId: order.customerId,
              serviceId: order.serviceId,
              salesUserId: order.salesUserId,
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
