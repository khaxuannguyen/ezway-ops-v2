import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { SearchInput } from "@/components/shared/search-input";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { PackagesTable } from "@/features/packages/components/packages-table";
import { listPackages } from "@/features/packages/queries";
import { parsePage, parseQuery } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "Kiện hàng",
};

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function PackagesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const page = parsePage(sp.page);
  const { rows, meta } = await listPackages({ q, page });

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Kiện hàng"}
        description={"Theo dõi kiện hàng thuộc các đơn vận chuyển."}
        actions={
          <LinkButton href="/admin/packages/new">
            <Plus className="h-4 w-4" aria-hidden />
            {"Tạo kiện hàng"}
          </LinkButton>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder={"Tìm theo mã vận đơn hoặc mã đơn hàng..."}
          defaultValue={q}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <PackagesTable rows={rows} />
        {meta.total > 0 ? (
          <PaginationBar
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            basePath="/admin/packages"
            searchParams={{ q: q || undefined }}
            labels={{
              prev: "Trang trước",
              next: "Trang sau",
              summary: (from, to, total) =>
                `Hiển thị ${from}-${to} / ${total}`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
