import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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
  // Đơn đã đẩy → chuyển về detail (ADMIN có nút "Bỏ đánh dấu" ở Order detail).
  if (order.carrierForwardedAt) {
    redirect(`/admin/orders/${order.id}`);
  }

  const sender = {
    companyName: process.env.COMPANY_NAME ?? "CÔNG TY TNHH TM&DV EZWAY",
    contactName: process.env.COMPANY_CONTACT_NAME ?? "ADMIN EZWAY",
    phone: process.env.COMPANY_PHONE ?? "0123456789",
    address: process.env.COMPANY_ADDRESS ?? "TP. Hồ Chí Minh, Việt Nam",
  };

  const packages = (order.pickupRequest?.packages ?? []).map((p) => ({
    description: p.description,
    actualWeightKg: Number(p.actualWeightKg),
    lengthCm: p.lengthCm,
    widthCm: p.widthCm,
    heightCm: p.heightCm,
  }));

  const invoiceItems = order.invoiceItems.map((it) => ({
    description: it.description,
    quantity: it.quantity,
    unit: it.unit,
    unitPriceUsd: Number(it.unitPriceUsd),
    totalValueUsd: Number(it.totalValueUsd),
  }));

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
            <Badge tone={order.recipient ? "info" : "warning"}>
              {order.recipient
                ? "Người nhận: " + order.recipient.country
                : "Chưa có người nhận"}
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
        recipient={order.recipient}
        orderInfo={{
          serviceTier: order.serviceTier,
          requiresSignature: order.requiresSignature,
          branchCode: order.branchCode,
          customsExportType: order.customsExportType,
        }}
        packages={packages}
        invoiceItems={invoiceItems}
        action={action}
      />
    </div>
  );
}
