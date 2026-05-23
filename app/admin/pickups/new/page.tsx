import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { PickupForm } from "@/features/pickups/components/pickup-form";
import { createPickup } from "@/features/pickups/actions";
import { listDriversLiteForPickup } from "@/features/pickups/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Tạo lệnh lấy hàng",
};

export default async function NewPickupPage() {
  const user = await requireUser();
  const isSale = user.role === "SALE";
  const drivers = isSale ? [] : await listDriversLiteForPickup();

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Tạo lệnh lấy hàng"}
        description={"Nhập điểm lấy + kiện hàng. Hệ thống cấp mã PK để gắn vào đơn."}
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
            drivers={drivers}
            showDispatch={!isSale}
            action={createPickup}
            submitLabel={"Tạo lệnh lấy hàng"}
          />
        </div>
      </Card>
    </div>
  );
}
