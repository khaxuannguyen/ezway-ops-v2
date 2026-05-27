import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { CustomerForm } from "@/features/customers/components/customer-form";
import { getCustomerById } from "@/features/customers/queries";
import { updateCustomer } from "@/features/customers/actions";
import { listSalesUsersLite } from "@/features/users/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Cập nhật khách hàng",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();
  // SALE chỉ sửa khách của mình.
  if (user.role === "SALE" && customer.salesUserId !== user.id) notFound();

  const action = updateCustomer.bind(null, customer.id);
  // Chỉ ADMIN thấy ô gán/chuyển sale phụ trách.
  const salesUsers =
    user.role === "ADMIN" ? await listSalesUsersLite() : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${"Cập nhật khách hàng"} - ${customer.code}`}
        description={"Chỉnh sửa thông tin khách hàng."}
        actions={
          <LinkButton
            href={`/admin/customers/${customer.id}`}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <CustomerForm
            defaults={{
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
              address: customer.address,
              nationalId: customer.nationalId,
              isBusiness: customer.isBusiness,
              taxCode: customer.taxCode,
              notes: customer.notes,
              salesUserId: customer.salesUserId,
            }}
            salesUsers={salesUsers}
            action={action}
            submitLabel={"Lưu thay đổi"}
          />
        </div>
      </Card>
    </div>
  );
}
