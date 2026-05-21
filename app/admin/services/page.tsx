import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { SearchInput } from "@/components/shared/search-input";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { ServicesTable } from "@/features/services/components/services-table";
import { TransportFilter } from "@/features/services/components/transport-filter";
import { listServices } from "@/features/services/queries";
import { parsePage, parseQuery, parseEnumParam } from "@/lib/pagination";
import type { ShippingTransportType } from "@/app/generated/prisma/enums";

const TRANSPORT_OPTIONS: ShippingTransportType[] = ["AIR", "SEA"];

export const metadata: Metadata = {
  title: "Dịch vụ",
};

interface PageProps {
  searchParams: Promise<{ q?: string; transportType?: string; page?: string }>;
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const page = parsePage(sp.page);
  const transportType = parseEnumParam(sp.transportType, TRANSPORT_OPTIONS);
  const { rows, meta } = await listServices({ q, transportType, page });

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Dịch vụ"}
        description={"Danh mục dịch vụ vận chuyển và các tuỳ chọn đi kèm."}
        actions={
          <LinkButton href="/admin/services/new">
            <Plus className="h-4 w-4" aria-hidden />
            {"Tạo dịch vụ"}
          </LinkButton>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder={"Tìm theo mã, tên, mã/tên đích đến..."} defaultValue={q} />
        <TransportFilter defaultValue={transportType} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <ServicesTable rows={rows} />
        {meta.total > 0 ? (
          <PaginationBar
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            basePath="/admin/services"
            searchParams={{ q: q || undefined, transportType }}
            labels={{
              prev: "Trang trước",
              next: "Trang sau",
              summary: (from, to, total) => `Hiển thị ${from}-${to} / ${total}`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
