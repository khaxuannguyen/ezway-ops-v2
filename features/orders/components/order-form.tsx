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
  ORDER_STATUS_LABEL,
  ORDER_STATUS_OPTIONS,
  PICKUP_METHOD_LABEL,
  TRANSPORT_TYPE_LABEL,
} from "@/lib/enum-labels";
import type {
  OrderStatus,
  PickupMethod,
  ShippingTransportType,
} from "@/app/generated/prisma/enums";

export interface CustomerOption {
  id: string;
  code: string;
  name: string;
  phone: string;
}
export interface ServiceOption {
  id: string;
  code: string;
  name: string;
  transportType: ShippingTransportType;
  destinationCode: string;
  destinationName: string;
}
export interface SalesUserOption {
  id: string;
  name: string;
}

export interface OrderFormDefaults {
  customerId?: string;
  serviceId?: string;
  salesUserId?: string | null;
  customerFeeVnd?: number;
  status?: OrderStatus;
  pickupMethod?: PickupMethod;
  notes?: string | null;
}

export interface OrderFormProps {
  defaults?: OrderFormDefaults;
  customers: CustomerOption[];
  services: ServiceOption[];
  salesUsers: SalesUserOption[];
  /** Khi người sửa là SALE — khoá ô chọn về chính họ. */
  lockedSalesUser?: { id: string; name: string } | null;
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
}

const PICKUP_OPTIONS: PickupMethod[] = [
  "NONE",
  "EZWAY_PICKUP",
  "CUSTOMER_DROP_OFF",
  "THIRD_PARTY",
];

export function OrderForm({
  defaults,
  customers,
  services,
  salesUsers,
  lockedSalesUser,
  action,
  submitLabel,
}: OrderFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  return (
    <form action={formAction}>
      {state && !state.ok && state.formError ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}

      <FormSection
        title={"Khách hàng & dịch vụ"}
        description={"Chọn khách hàng và dịch vụ vận chuyển."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={"Khách hàng"}
            htmlFor="customerId"
            required
            error={err("customerId")}
          >
            <Select
              id="customerId"
              name="customerId"
              defaultValue={defaults?.customerId ?? ""}
            >
              <option value="">--</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code + " - " + c.name + " (" + c.phone + ")"}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={"Dịch vụ"}
            htmlFor="serviceId"
            required
            error={err("serviceId")}
          >
            <Select
              id="serviceId"
              name="serviceId"
              defaultValue={defaults?.serviceId ?? ""}
            >
              <option value="">--</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code + " - " + s.name + " [" + TRANSPORT_TYPE_LABEL[s.transportType] + " > " + s.destinationName + "]"}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={"Nhân viên sale"}
            htmlFor="salesUserId"
            error={err("salesUserId")}
            description={
              lockedSalesUser
                ? "Đơn này được gán cho bạn."
                : "Nhân viên kinh doanh phụ trách đơn."
            }
          >
            {lockedSalesUser ? (
              <>
                <input type="hidden" name="salesUserId" value={lockedSalesUser.id} />
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  {lockedSalesUser.name + " (bạn)"}
                </div>
              </>
            ) : (
              <Select
                id="salesUserId"
                name="salesUserId"
                defaultValue={defaults?.salesUserId ?? ""}
              >
                <option value="">{"— Chưa gán —"}</option>
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </FormSection>

      <FormSection
        title={"Cước phí"}
        description={
          "Cước thu khách. Cân tính cước tự lấy từ lệnh lấy hàng — đổi dịch vụ sẽ " +
          "tính lại cước theo hệ số quy đổi mới."
        }
      >
        <Field
          label={"Cước thu khách (VND)"}
          htmlFor="customerFeeVnd"
          required
          error={err("customerFeeVnd")}
        >
          <Input
            id="customerFeeVnd"
            name="customerFeeVnd"
            type="number"
            step="1000"
            min="0"
            defaultValue={defaults?.customerFeeVnd?.toString() ?? ""}
            inputMode="numeric"
          />
        </Field>
      </FormSection>

      <FormSection
        title={"Trạng thái & ghi chú"}
        description={"Trạng thái xử lý và ghi chú đơn hàng."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={"Trạng thái"}
            htmlFor="status"
            required
            error={err("status")}
          >
            <Select
              id="status"
              name="status"
              defaultValue={defaults?.status ?? "DRAFT"}
            >
              {ORDER_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={"Phương thức lấy hàng"}
            htmlFor="pickupMethod"
            required
            error={err("pickupMethod")}
          >
            <Select
              id="pickupMethod"
              name="pickupMethod"
              defaultValue={defaults?.pickupMethod ?? "NONE"}
            >
              {PICKUP_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PICKUP_METHOD_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={"Ghi chú"}
            htmlFor="notes"
            className="md:col-span-2"
            error={err("notes")}
          >
            <Textarea
              id="notes"
              name="notes"
              defaultValue={defaults?.notes ?? ""}
              rows={3}
            />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-2 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          {"Huỷ"}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
