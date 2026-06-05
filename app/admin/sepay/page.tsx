import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoneyDisplay } from "@/components/shared/money-display";
import { listSepayTransactions } from "@/features/sepay/queries";
import { ManualMatchForm } from "@/features/sepay/components/manual-match-form";
import { IgnoreSepayButton } from "@/features/sepay/components/ignore-button";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SepayMatchStatus } from "@/app/generated/prisma/enums";

export const metadata: Metadata = { title: "Đối soát Sepay" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<SepayMatchStatus, string> = {
  PENDING: "Chờ xử lý",
  MATCHED: "Đã đối soát",
  UNMATCHED: "Không tìm thấy đơn",
  AMBIGUOUS: "Nhiều đơn khả thi",
  IGNORED: "Bỏ qua",
};

const STATUS_TONE: Record<
  SepayMatchStatus,
  "neutral" | "success" | "warning" | "destructive"
> = {
  PENDING: "warning",
  MATCHED: "success",
  UNMATCHED: "destructive",
  AMBIGUOUS: "destructive",
  IGNORED: "neutral",
};

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SepayPage({ searchParams }: PageProps) {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "STAFF") {
    redirect("/admin/dashboard");
  }
  const sp = await searchParams;
  const tab = sp.tab ?? "pending";

  const [pending, matched, all] = await Promise.all([
    listSepayTransactions({ status: ["UNMATCHED", "AMBIGUOUS"], take: 200 }),
    listSepayTransactions({ status: "MATCHED", take: 50 }),
    listSepayTransactions({ take: 100 }),
  ]);

  const rows = tab === "matched" ? matched : tab === "all" ? all : pending;
  const showActions = tab === "pending";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đối soát Sepay"
        description="Giao dịch chuyển khoản tự động đối soát từ MB Bank qua Sepay. Đơn không tự match được sẽ liệt kê ở 'Cần xử lý' để admin gán tay."
      />

      <div className="flex items-center gap-2 border-b border-border">
        {[
          { value: "pending", label: "Cần xử lý", count: pending.length, tone: "warning" as const },
          { value: "matched", label: "Đã đối soát", count: matched.length, tone: "success" as const },
          { value: "all", label: "Tất cả", count: all.length, tone: undefined },
        ].map((t) => (
          <Link
            key={t.value}
            href={`/admin/sepay?tab=${t.value}`}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {t.count > 0 ? (
              <Badge tone={t.tone ?? "neutral"}>{t.count}</Badge>
            ) : null}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {tab === "matched"
              ? "Giao dịch đã đối soát (50 gần nhất)"
              : tab === "all"
                ? "Tất cả giao dịch (100 gần nhất)"
                : `Cần xử lý (${pending.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title={
                  tab === "pending"
                    ? "Không có giao dịch nào cần xử lý."
                    : "Chưa có dữ liệu."
                }
                description={
                  tab === "pending"
                    ? "Sepay sẽ ping webhook khi có chuyển khoản về STK MB."
                    : undefined
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{"Thời gian"}</TableHead>
                  <TableHead>{"Số tiền"}</TableHead>
                  <TableHead>{"Memo"}</TableHead>
                  <TableHead>{"Trạng thái"}</TableHead>
                  <TableHead>{"Đơn match"}</TableHead>
                  {showActions ? (
                    <TableHead className="w-72">{"Thao tác"}</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(tx.transactionDate)}
                      <div className="text-muted-foreground">
                        {tx.bankBrandName ?? "—"} · {tx.referenceCode ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      <MoneyDisplay value={tx.amountVnd} />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate text-sm">{tx.content || "—"}</div>
                      {tx.matchNotes ? (
                        <div className="text-xs text-muted-foreground">
                          {tx.matchNotes}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge tone={STATUS_TONE[tx.matchStatus]}>
                        {STATUS_LABEL[tx.matchStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tx.matchedOrder ? (
                        <Link
                          href={`/admin/orders/${tx.matchedOrder.id}`}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {tx.matchedOrder.code}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {showActions ? (
                      <TableCell className="space-y-2">
                        <ManualMatchForm sepayTxId={tx.id} />
                        <IgnoreSepayButton sepayTxId={tx.id} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
