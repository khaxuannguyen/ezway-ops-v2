import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { CarrierCopyHelper } from "@/features/orders/components/carrier-copy-helper";
import { getOrderById } from "@/features/orders/queries";
import { markOrderForwarded } from "@/features/orders/actions";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Đẩy carrier",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ForwardOrderPage({ params }: PageProps) {
  await requireRole("ADMIN", "STAFF");
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();
  if (order.carrierForwardedAt) {
    redirect(`/admin/orders/${order.id}`);
  }

  // Sender = Customer (sender VN). CCCD lấy từ Customer.nationalId.
  const sender = {
    name: order.customer.name,
    phone: order.customer.phone,
    nationalId: order.customer.nationalId,
    address: order.customer.address ?? "",
  };

  const packages = (order.pickupRequest?.packages ?? []).map((p) => ({
    description: p.description,
    actualWeightKg: Number(p.actualWeightKg),
    lengthCm: p.lengthCm,
    widthCm: p.widthCm,
    heightCm: p.heightCm,
  }));

  const recipient = order.recipient
    ? {
        contactName: order.recipient.contactName,
        phone: order.recipient.phone,
        address: order.recipient.address,
      }
    : null;

  const action = markOrderForwarded.bind(null, order.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Đẩy carrier — " + order.code}
        description={
          "Click copy từng cụm, paste sang portal Kango/KSN/Go. Cuối: nhập tracking carrier trả về."
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={recipient ? "info" : "warning"}>
              {recipient ? "Có người nhận" : "Chưa có người nhận"}
            </Badge>
            <LinkButton href={`/admin/orders/${order.id}`} variant="outline">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {"Quay lại"}
            </LinkButton>
          </div>
        }
      />

      <CarrierCopyHelper
        orderCode={order.code}
        sender={sender}
        recipient={recipient}
        orderInfo={{
          serviceTier: order.serviceTier,
          requiresSignature: order.requiresSignature,
          branchCode: order.branchCode,
          customsExportType: order.customsExportType,
        }}
        packages={packages}
        action={action}
      />
    </div>
  );
}
