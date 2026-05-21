import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { SearchInput } from "@/components/shared/search-input";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { CostItemsTable } from "@/features/cost-items/components/cost-items-table";
import { CategoryFilter } from "@/features/cost-items/components/category-filter";
import { listCostItems } from "@/features/cost-items/queries";
import { parsePage, parseQuery, parseEnumParam } from "@/lib/pagination";
import { COST_CATEGORY_OPTIONS } from "@/lib/enum-labels";
import type { CostCategory } from "@/app/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Khoản chi phí",
};

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}

export default async function CostItemsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const page = parsePage(sp.page);
  const category = parseEnumParam<CostCategory>(sp.category, COST_CATEGORY_OPTIONS);
  const { rows, meta } = await listCostItems({ q, category, page });

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Khoản chi phí"}
        description={"Danh mục khoản chi phí phụ áp dụng cho đơn hàng và lệnh lấy hàng."}
        actions={
          <LinkButton href="/admin/cost-items/new">
            <Plus className="h-4 w-4" aria-hidden />
            {"Tạo khoản chi phí"}
          </LinkButton>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder={"Tìm theo mã, tên, mô tả..."} defaultValue={q} />
        <CategoryFilter defaultValue={category} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <CostItemsTable rows={rows} />
        {meta.total > 0 ? (
          <PaginationBar
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            basePath="/admin/cost-items"
            searchParams={{ q: q || undefined, category }}
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
