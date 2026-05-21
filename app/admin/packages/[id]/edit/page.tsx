import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { PackageForm } from "@/features/packages/components/package-form";
import {
  getPackageById,
  listOrdersLiteForPicker,
} from "@/features/packages/queries";
import { updatePackage } from "@/features/packages/actions";

export const metadata: Metadata = {
  title: "Cập nhật kiện hàng",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPackagePage({ params }: PageProps) {
  const { id } = await params;
  const [pkg, orders] = await Promise.all([
    getPackageById(id),
    listOrdersLiteForPicker(),
  ]);
  if (!pkg) notFound();

  const action = updatePackage.bind(null, pkg.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Cập nhật kiện hàng"}
        description={"Chỉnh sửa cân nặng và kích thước kiện hàng."}
        actions={
          <LinkButton href={`/admin/packages/${pkg.id}`} variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <PackageForm
            orders={orders}
            defaults={{
              orderId: pkg.order.id,
              trackingCode: pkg.trackingCode,
              description: pkg.description,
              actualWeightKg: pkg.actualWeightKg.toString(),
              lengthCm: pkg.lengthCm,
              widthCm: pkg.widthCm,
              heightCm: pkg.heightCm,
            }}
            action={action}
            submitLabel={"Lưu thay đổi"}
          />
        </div>
      </Card>
    </div>
  );
}
