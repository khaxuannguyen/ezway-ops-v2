import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { SearchInput } from "@/components/shared/search-input";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { PickupsTable } from "@/features/pickups/components/pickups-table";
import { PickupStatusFilter } from "@/features/pickups/components/pickup-status-filter";
import { listPickups } from "@/features/pickups/queries";
import { parsePage, parseQuery, parseEnumParam } from "@/lib/pagination";
import { PICKUP_STATUS_OPTIONS } from "@/lib/enum-labels";
import type { PickupStatus } from "@/app/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Lệnh lấy hàng",
};

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function PickupsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const page = parsePage(sp.page);
  const status = parseEnumParam<PickupStatus>(sp.status, PICKUP_STATUS_OPTIONS);
  const { rows, meta } = await listPickups({ q, status, page });

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Lệnh lấy hàng"}
        description={"Quản lý lệnh lấy hàng tại điểm khách và phân công tài xế."}
        actions={
          <LinkButton href="/admin/pickups/new">
            <Plus className="h-4 w-4" aria-hidden />
            {"Tạo lệnh lấy hàng"}
          </LinkButton>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder={"Tìm theo mã đơn, người/SĐT liên hệ, địa chỉ..."} defaultValue={q} />
        <PickupStatusFilter defaultValue={status} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <PickupsTable rows={rows} />
        {meta.total > 0 ? (
          <PaginationBar
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            basePath="/admin/pickups"
            searchParams={{ q: q || undefined, status }}
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
