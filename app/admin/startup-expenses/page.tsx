import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { SearchInput } from "@/components/shared/search-input";
import { PaginationBar } from "@/components/shared/pagination-bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { ExpensesTable } from "@/features/startup-expenses/components/expenses-table";
import { ExpenseFilters } from "@/features/startup-expenses/components/expense-filters";
import {
  listStartupExpenses,
  getStartupExpenseSummary,
} from "@/features/startup-expenses/queries";
import { parsePage, parseQuery, parseEnumParam } from "@/lib/pagination";
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_CATEGORY_TONE,
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_STATUS_OPTIONS,
} from "@/lib/enum-labels";
import type {
  ExpenseCategory,
  ExpenseStatus,
} from "@/app/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Chi phí thành lập",
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function StartupExpensesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = parseQuery(sp.q);
  const page = parsePage(sp.page);
  const category = parseEnumParam<ExpenseCategory>(sp.category, EXPENSE_CATEGORY_OPTIONS);
  const status = parseEnumParam<ExpenseStatus>(sp.status, EXPENSE_STATUS_OPTIONS);

  const [{ rows, meta }, summary] = await Promise.all([
    listStartupExpenses({ q, category, status, page }),
    getStartupExpenseSummary(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Chi phí thành lập"}
        description={"Theo dõi chi phí ban đầu thành lập công ty."}
        actions={
          <LinkButton href="/admin/startup-expenses/new">
            <Plus className="h-4 w-4" aria-hidden />
            {"Thêm khoản chi"}
          </LinkButton>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="border-b-0 pb-2">
            <CardDescription>{"Tổng chi phí thành lập"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            <p className="text-2xl font-semibold tabular-nums">
              <MoneyDisplay value={summary.grandTotalVnd} emphasis="strong" />
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.totalCount + " khoản chi"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b-0 pb-2">
            <CardDescription>{"Đã thanh toán"}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold tabular-nums">
              <MoneyDisplay value={summary.paidTotalVnd} tone="positive" emphasis="strong" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b-0 pb-2">
            <CardDescription>{"Còn phải trả"}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold tabular-nums">
              <MoneyDisplay value={summary.unpaidTotalVnd} tone="negative" emphasis="strong" />
            </p>
          </CardContent>
        </Card>
      </section>

      {summary.byCategory.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{"Chi phí theo nhóm"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.byCategory.map((c) => (
              <div key={c.category} className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2">
                  <Badge tone={EXPENSE_CATEGORY_TONE[c.category]}>
                    {EXPENSE_CATEGORY_LABEL[c.category]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {c.count + " khoản chi"}
                  </span>
                </span>
                <MoneyDisplay value={c.amountVnd} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder={"Tìm theo mã, tên khoản, người thanh toán..."} defaultValue={q} />
        <ExpenseFilters category={category} status={status} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <ExpensesTable rows={rows} />
        {meta.total > 0 ? (
          <PaginationBar
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            basePath="/admin/startup-expenses"
            searchParams={{ q: q || undefined, category, status }}
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
