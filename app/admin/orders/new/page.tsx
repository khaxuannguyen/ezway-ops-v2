import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { OrderCreateForm } from "@/features/orders/components/order-create-form";
import { createOrder } from "@/features/orders/actions";
import { listAllServicesLite } from "@/features/orders/queries";
import { listAllCustomersLite } from "@/features/customers/queries";
import { listActiveCostItemsLite } from "@/features/cost-items/queries";
import { listActiveSuppliesLite } from "@/features/supplies/queries";
import { listSalesUsersLite } from "@/features/users/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Tạo đơn hàng",
};

interface PageProps {
  searchParams: Promise<{ customerId?: string }>;
}

export default async function NewOrderPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const isSale = user.role === "SALE";
  const sp = await searchParams;
  const [customers, services, costItems, supplies, salesUsers] =
    await Promise.all([
      // SALE chỉ thấy khách của mình trong ô chọn khách hàng.
      listAllCustomersLite(isSale ? user.id : undefined),
      listAllServicesLite(),
      listActiveCostItemsLite(),
      listActiveSuppliesLite(),
      listSalesUsersLite(),
    ]);

  const lockedSalesUser =
    user.role === "SALE" ? { id: user.id, name: user.name } : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Tạo đơn hàng"}
        description={"Tạo đơn hàng mới và gán dịch vụ vận chuyển."}
        actions={
          <LinkButton href="/admin/orders" variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <OrderCreateForm
            customers={customers}
            services={services}
            costItems={costItems}
            supplies={supplies}
            salesUsers={salesUsers}
            lockedSalesUser={lockedSalesUser}
            defaults={{ customerId: sp.customerId }}
            action={createOrder}
            submitLabel={"Tạo đơn hàng"}
          />
        </div>
      </Card>
    </div>
  );
}
