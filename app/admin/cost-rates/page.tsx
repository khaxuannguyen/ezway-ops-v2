import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { CostRateServicesTable } from "@/features/cost-rates/components/cost-rate-services-table";
import { listCostRateServices } from "@/features/cost-rates/queries";
import { parsePage, parseQuery } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "Bảng giá chi phí",
};

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function CostRatesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const page = parsePage(sp.page);
  const { rows, meta } = await listCostRateServices({ q, page });

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Bảng giá chi phí"}
        description={"Bảng giá theo dải cân của từng dịch vụ vận chuyển."}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder={"Tìm theo mã hoặc tên dịch vụ..."} defaultValue={q} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <CostRateServicesTable rows={rows} />
        {meta.total > 0 ? (
          <PaginationBar
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            basePath="/admin/cost-rates"
            searchParams={{ q: q || undefined }}
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
