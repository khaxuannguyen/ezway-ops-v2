import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { SearchInput } from "@/components/shared/search-input";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { CustomersTable } from "@/features/customers/components/customers-table";
import { listCustomers } from "@/features/customers/queries";
import { parsePage, parseQuery } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "Khách hàng",
};

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const page = parsePage(sp.page);
  const { rows, meta } = await listCustomers({ q, page });

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Khách hàng"}
        description={"Quản lý hồ sơ khách hàng doanh nghiệp và cá nhân."}
        actions={
          <LinkButton href="/admin/customers/new">
            <Plus className="h-4 w-4" aria-hidden />
            {"Tạo khách hàng"}
          </LinkButton>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder={"Tìm theo mã, tên, số điện thoại, email..."}
          defaultValue={q}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <CustomersTable rows={rows} />
        {meta.total > 0 ? (
          <PaginationBar
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            basePath="/admin/customers"
            searchParams={{ q: q || undefined }}
            labels={{
              prev: "Trang trước",
              next: "Trang sau",
              summary: (from, to, total) =>
                `Hiển thị ${from}-${to} trong ${total} khách hàng`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
