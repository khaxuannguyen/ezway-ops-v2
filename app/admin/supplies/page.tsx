import type { Metadata } from "next";
import { Plus, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { SearchInput } from "@/components/shared/search-input";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { SuppliesTable } from "@/features/supplies/components/supplies-table";
import { CategoryFilter } from "@/features/supplies/components/category-filter";
import { listSupplies } from "@/features/supplies/queries";
import { parsePage, parseQuery, parseEnumParam } from "@/lib/pagination";
import { SUPPLY_CATEGORY_OPTIONS } from "@/lib/enum-labels";
import type { SupplyCategory } from "@/app/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Kho vật tư",
};

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}

export default async function SuppliesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const page = parsePage(sp.page);
  const category = parseEnumParam<SupplyCategory>(sp.category, SUPPLY_CATEGORY_OPTIONS);
  const { rows, meta, lowStockCount } = await listSupplies({ q, category, page });

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Kho vật tư"}
        description={"Quản lý vật tư đóng gói: tồn kho, nhập xuất, kiểm kê."}
        actions={
          <LinkButton href="/admin/supplies/new">
            <Plus className="h-4 w-4" aria-hidden />
            {"Thêm vật tư"}
          </LinkButton>
        }
      />

      {lowStockCount > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          <span>{lowStockCount + " vật tư sắp hết / hết hàng"}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder={"Tìm theo mã hoặc tên vật tư..."} defaultValue={q} />
        <CategoryFilter defaultValue={category} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <SuppliesTable rows={rows} />
        {meta.total > 0 ? (
          <PaginationBar
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            basePath="/admin/supplies"
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
