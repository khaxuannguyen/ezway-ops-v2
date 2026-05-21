import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { ExpenseForm } from "@/features/startup-expenses/components/expense-form";
import { getStartupExpenseById } from "@/features/startup-expenses/queries";
import { updateStartupExpense } from "@/features/startup-expenses/actions";

export const metadata: Metadata = {
  title: "Cập nhật khoản chi",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStartupExpensePage({ params }: PageProps) {
  const { id } = await params;
  const expense = await getStartupExpenseById(id);
  if (!expense) notFound();

  const action = updateStartupExpense.bind(null, expense.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={"Cập nhật khoản chi" + " - " + expense.code}
        description={"Chỉnh sửa thông tin khoản chi."}
        actions={
          <LinkButton href={`/admin/startup-expenses/${expense.id}`} variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {"Quay lại"}
          </LinkButton>
        }
      />
      <Card>
        <div className="px-6 pb-6">
          <ExpenseForm
            defaults={{
              itemName: expense.itemName,
              category: expense.category,
              amountVnd: expense.amountVnd,
              status: expense.status,
              paymentDate: expense.paymentDate,
              paidBy: expense.paidBy,
              note: expense.note,
            }}
            action={action}
            submitLabel={"Lưu thay đổi"}
          />
        </div>
      </Card>
    </div>
  );
}
