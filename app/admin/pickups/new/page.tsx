import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { PickupForm } from "@/features/pickups/components/pickup-form";
import { createPickup } from "@/features/pickups/actions";
import {
  listOrdersWithoutPickup,
  listDriversLiteForPickup,
} from "@/features/pickups/queries";

export const metadata: Metadata = {
  title: "Tạo lệnh lấy hàng",
};

interface PageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function NewPickupPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const [orders, drivers] = await Promise.all([
    listOrdersWithoutPickup(sp.orderId),
    listDriversLiteForPickup(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Tạo lệnh lấy hàng"}
        description={"Tạo lệnh lấy hàng và gán vào đơn vận chuyển."}
        actions={
          <LinkButton href="/admin/pickups" variant="outline">
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
            defaults={{ orderId: sp.orderId }}
            lockOrder={Boolean(sp.orderId)}
            action={createPickup}
            submitLabel={"Tạo lệnh lấy hàng"}
          />
        </div>
      </Card>
    </div>
  );
}
