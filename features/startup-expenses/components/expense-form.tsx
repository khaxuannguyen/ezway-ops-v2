"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/shared/field";
import { FormSection } from "@/components/shared/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { fieldError, type ActionResult } from "@/lib/action-result";
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_STATUS_LABEL,
  EXPENSE_STATUS_OPTIONS,
} from "@/lib/enum-labels";
import { suggestExpenseCategory } from "@/features/startup-expenses/category-keywords";
import type {
  ExpenseCategory,
  ExpenseStatus,
} from "@/app/generated/prisma/enums";

const PAYER_KHA = "Kha - Giám đốc";

export interface ExpenseFormDefaults {
  itemName?: string;
  category?: ExpenseCategory;
  amountVnd?: number;
  status?: ExpenseStatus;
  paymentDate?: Date | string | null;
  paidBy?: string | null;
  note?: string | null;
}

export interface ExpenseFormProps {
  defaults?: ExpenseFormDefaults;
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
}

function toDateInput(d?: Date | string | null): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate());
}

export function ExpenseForm({ defaults, action, submitLabel }: ExpenseFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  // Item name drives an auto-suggested category until the admin picks one.
  const [itemName, setItemName] = React.useState(defaults?.itemName ?? "");
  const [category, setCategory] = React.useState<ExpenseCategory>(
    defaults?.category ?? "OTHER"
  );
  const [categoryTouched, setCategoryTouched] = React.useState(
    Boolean(defaults?.category)
  );

  const onItemNameChange = (value: string) => {
    setItemName(value);
    if (!categoryTouched) {
      const suggested = suggestExpenseCategory(value);
      if (suggested) setCategory(suggested);
    }
  };

  const initialPaidBy = defaults?.paidBy ?? "";
  const [payerMode, setPayerMode] = React.useState<"KHA" | "OTHER">(
    initialPaidBy === "" || initialPaidBy === PAYER_KHA ? "KHA" : "OTHER"
  );
  const [otherName, setOtherName] = React.useState(
    initialPaidBy && initialPaidBy !== PAYER_KHA ? initialPaidBy : ""
  );
  const paidByValue = payerMode === "KHA" ? PAYER_KHA : otherName;

  return (
    <form action={formAction}>
      {state && !state.ok && state.formError ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}

      <FormSection title={"Khoản chi phí"} description={"Tên khoản chi, nhóm và số tiền."}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Tên khoản chi"} htmlFor="itemName" required error={err("itemName")} className="md:col-span-2">
            <Input
              id="itemName"
              name="itemName"
              value={itemName}
              onChange={(e) => onItemNameChange(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field
            label={"Nhóm chi phí"}
            htmlFor="category"
            required
            error={err("category")}
            description={categoryTouched ? undefined : "Oị nhóm tự đề xuất theo tên khoản chi — có thể sửa."}
          >
            <Select
              id="category"
              name="category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as ExpenseCategory);
                setCategoryTouched(true);
              }}
            >
              {EXPENSE_CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={"Số tiền (VND)"} htmlFor="amountVnd" required error={err("amountVnd")}>
            <Input
              id="amountVnd"
              name="amountVnd"
              type="number"
              step="1000"
              min="0"
              defaultValue={defaults?.amountVnd?.toString() ?? ""}
              inputMode="numeric"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title={"Thanh toán"} description={"Trạng thái, ngày và người thanh toán."}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Trạng thái"} htmlFor="status" required error={err("status")}>
            <Select id="status" name="status" defaultValue={defaults?.status ?? "UNPAID"}>
              {EXPENSE_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {EXPENSE_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={"Ngày thanh toán"} htmlFor="paymentDate" error={err("paymentDate")}>
            <Input
              id="paymentDate"
              name="paymentDate"
              type="date"
              defaultValue={toDateInput(defaults?.paymentDate)}
            />
          </Field>
          <Field label={"Người thanh toán"} htmlFor="payerMode" error={err("paidBy")}>
            <Select
              id="payerMode"
              value={payerMode}
              onChange={(e) => setPayerMode(e.target.value as "KHA" | "OTHER")}
            >
              <option value="KHA">{"Kha - Giám đốc"}</option>
              <option value="OTHER">{"Thành viên khác (ghi tên)"}</option>
            </Select>
            <input type="hidden" name="paidBy" value={paidByValue} />
          </Field>
          {payerMode === "OTHER" ? (
            <Field label={"Tên người thanh toán"} htmlFor="otherName">
              <Input
                id="otherName"
                value={otherName}
                onChange={(e) => setOtherName(e.target.value)}
                autoComplete="off"
              />
            </Field>
          ) : null}
          <Field label={"Ghi chú"} htmlFor="note" className="md:col-span-2" error={err("note")}>
            <Textarea id="note" name="note" defaultValue={defaults?.note ?? ""} rows={3} />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-2 pt-6">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          {"Huỷ"}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
