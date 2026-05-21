import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { SearchInput } from "@/components/shared/search-input";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { UsersTable } from "@/features/users/components/users-table";
import { RoleFilter } from "@/features/users/components/role-filter";
import { listUsers } from "@/features/users/queries";
import { ASSIGNABLE_ROLES } from "@/features/users/schemas";
import { parsePage, parseQuery, parseEnumParam } from "@/lib/pagination";
import { requireRole } from "@/lib/auth";
import type { UserRole } from "@/app/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Tài khoản",
};

interface PageProps {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  await requireRole("ADMIN");

  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const page = parsePage(sp.page);
  const role = parseEnumParam<UserRole>(sp.role, ASSIGNABLE_ROLES);
  const { rows, meta } = await listUsers({ q, role, page });

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Tài khoản"}
        description={"Quản lý tài khoản đăng nhập, vai trò và mật khẩu."}
        actions={
          <LinkButton href="/admin/users/new">
            <Plus className="h-4 w-4" aria-hidden />
            {"Thêm tài khoản"}
          </LinkButton>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder={"Tìm theo tên, email..."} defaultValue={q} />
        <RoleFilter defaultValue={role} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <UsersTable rows={rows} />
        {meta.total > 0 ? (
          <PaginationBar
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            basePath="/admin/users"
            searchParams={{ q: q || undefined, role }}
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
