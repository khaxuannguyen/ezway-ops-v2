import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { PackageForm } from "@/features/packages/components/package-form";
import { createPackage } from "@/features/packages/actions";
import { listOrdersLiteForPicker } from "@/features/packages/queries";

export const metadata: Metadata = {
  title: "Tạo kiện hàng",
};

interface PageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function NewPackagePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const orders = await listOrdersLiteForPicker();

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Tạo kiện hàng"}
        description={"Thêm kiện hàng và gán vào đơn vận chuyển."}
        actions={
          <LinkButton href="/admin/packages" variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <PackageForm
            orders={orders}
            defaults={{ orderId: sp.orderId }}
            lockOrder={Boolean(sp.orderId)}
            action={createPackage}
            submitLabel={"Tạo kiện hàng"}
          />
        </div>
      </Card>
    </div>
  );
}
