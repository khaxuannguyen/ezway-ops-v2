import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { SearchInput } from "@/components/shared/search-input";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { OrdersTable } from "@/features/orders/components/orders-table";
import { OrderStatusFilter } from "@/features/orders/components/status-filter";
import { listOrders } from "@/features/orders/queries";
import {
  parsePage,
  parseQuery,
  parseEnumParam,
} from "@/lib/pagination";
import { ORDER_STATUS_OPTIONS } from "@/lib/enum-labels";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Đơn hàng",
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const isSale = user.role === "SALE";

  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const page = parsePage(sp.page);
  const status = parseEnumParam(sp.status, ORDER_STATUS_OPTIONS);
  const { rows, meta } = await listOrders({
    q,
    status,
    page,
    salesUserId: isSale ? user.id : undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSale ? "Đơn hàng của tôi" : "Đơn hàng"}
        description={
          isSale
            ? "Các đơn hàng bạn phụ trách."
            : "Quản lý đơn hàng, trạng thái xử lý và doanh thu."
        }
        actions={
          <LinkButton href="/admin/orders/new">
            <Plus className="h-4 w-4" aria-hidden />
            {"Tạo đơn hàng"}
          </LinkButton>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder={"Tìm theo mã đơn, mã/tên khách hàng..."}
          defaultValue={q}
        />
        <OrderStatusFilter defaultValue={status} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <OrdersTable rows={rows} />
        {meta.total > 0 ? (
          <PaginationBar
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            basePath="/admin/orders"
            searchParams={{ q: q || undefined, status }}
            labels={{
              prev: "Trang trước",
              next: "Trang sau",
              summary: (from, to, total) =>
                `Hiển thị ${from}-${to} trong ${total} đơn hàng`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
