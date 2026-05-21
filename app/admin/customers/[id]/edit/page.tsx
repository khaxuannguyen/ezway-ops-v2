import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { CustomerForm } from "@/features/customers/components/customer-form";
import { getCustomerById } from "@/features/customers/queries";
import { updateCustomer } from "@/features/customers/actions";

export const metadata: Metadata = {
  title: "Cập nhật khách hàng",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: PageProps) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const action = updateCustomer.bind(null, customer.id);

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
              isBusiness: customer.isBusiness,
              taxCode: customer.taxCode,
              notes: customer.notes,
            }}
            action={action}
            submitLabel={"Lưu thay đổi"}
          />
        </div>
      </Card>
    </div>
  );
}
