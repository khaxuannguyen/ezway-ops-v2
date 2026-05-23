import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { CustomerForm } from "@/features/customers/components/customer-form";
import { createCustomer } from "@/features/customers/actions";
import { listSalesUsersLite } from "@/features/users/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Tạo khách hàng",
};

export default async function NewCustomerPage() {
  const user = await requireUser();
  // Chỉ ADMIN thấy ô gán sale; SALE tự gán bản thân, STAFF tạo khách không thuộc sale nào.
  const salesUsers =
    user.role === "ADMIN" ? await listSalesUsersLite() : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Tạo khách hàng"}
        description={"Thêm khách hàng mới vào hệ thống."}
        actions={
          <LinkButton href="/admin/customers" variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <CustomerForm
            salesUsers={salesUsers}
            action={createCustomer}
            submitLabel={"Tạo khách hàng"}
          />
        </div>
      </Card>
    </div>
  );
}
