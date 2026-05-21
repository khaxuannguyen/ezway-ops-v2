import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { SearchInput } from "@/components/shared/search-input";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { DriversTable } from "@/features/drivers/components/drivers-table";
import { VehicleFilter } from "@/features/drivers/components/vehicle-filter";
import { listDrivers } from "@/features/drivers/queries";
import { parsePage, parseQuery, parseEnumParam } from "@/lib/pagination";
import { VEHICLE_TYPE_OPTIONS } from "@/lib/enum-labels";
import type { VehicleType } from "@/app/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Tài xế",
};

interface PageProps {
  searchParams: Promise<{ q?: string; vehicleType?: string; page?: string }>;
}

export default async function DriversPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const page = parsePage(sp.page);
  const vehicleType = parseEnumParam<VehicleType>(sp.vehicleType, VEHICLE_TYPE_OPTIONS);
  const { rows, meta } = await listDrivers({ q, vehicleType, page });

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Tài xế"}
        description={"Quản lý đội ngũ tài xế và phương tiện giao nhận."}
        actions={
          <LinkButton href="/admin/drivers/new">
            <Plus className="h-4 w-4" aria-hidden />
            {"Thêm tài xế"}
          </LinkButton>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder={"Tìm theo tên, email, SĐT, biển số..."} defaultValue={q} />
        <VehicleFilter defaultValue={vehicleType} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <DriversTable rows={rows} />
        {meta.total > 0 ? (
          <PaginationBar
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            basePath="/admin/drivers"
            searchParams={{ q: q || undefined, vehicleType }}
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
