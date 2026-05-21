import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { ExpenseForm } from "@/features/startup-expenses/components/expense-form";
import { createStartupExpense } from "@/features/startup-expenses/actions";

export const metadata: Metadata = {
  title: "Thêm khoản chi",
};

export default function NewStartupExpensePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={"Thêm khoản chi"}
        description={"Ghi nhận một khoản chi phí thành lập."}
        actions={
          <LinkButton href="/admin/startup-expenses" variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <ExpenseForm action={createStartupExpense} submitLabel={"Thêm khoản chi"} />
        </div>
      </Card>
    </div>
  );
}
