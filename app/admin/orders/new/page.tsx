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

export const metadata: Metadata = {
  title: "Tạo đơn hàng",
};

interface PageProps {
  searchParams: Promise<{ customerId?: string }>;
}

export default async function NewOrderPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const [customers, services, costItems, supplies] = await Promise.all([
    listAllCustomersLite(),
    listAllServicesLite(),
    listActiveCostItemsLite(),
    listActiveSuppliesLite(),
  ]);

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
            defaults={{ customerId: sp.customerId }}
            action={createOrder}
            submitLabel={"Tạo đơn hàng"}
          />
        </div>
      </Card>
    </div>
  );
}
