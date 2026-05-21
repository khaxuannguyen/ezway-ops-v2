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
import { PICKUP_STATUS_LABEL, PICKUP_STATUS_OPTIONS } from "@/lib/enum-labels";
import type { PickupStatus } from "@/app/generated/prisma/enums";

export interface OrderPickerOption {
  id: string;
  code: string;
  customer: { code: string; name: string; phone: string; address: string };
}
export interface DriverPickerOption {
  id: string;
  phone: string;
  user: { name: string };
}

export interface PickupFormDefaults {
  orderId?: string;
  driverId?: string | null;
  pickupAddress?: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  scheduledAt?: Date | string | null;
  notes?: string | null;
  currentStatus?: PickupStatus;
}

export interface PickupFormProps {
  orders: OrderPickerOption[];
  drivers: DriverPickerOption[];
  defaults?: PickupFormDefaults;
  lockOrder?: boolean;
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
}

function toDateTimeLocal(d?: Date | string | null): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    dt.getFullYear() +
    "-" +
    pad(dt.getMonth() + 1) +
    "-" +
    pad(dt.getDate()) +
    "T" +
    pad(dt.getHours()) +
    ":" +
    pad(dt.getMinutes())
  );
}

export function PickupForm({
  orders,
  drivers,
  defaults,
  lockOrder,
  action,
  submitLabel,
}: PickupFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  const [address, setAddress] = React.useState(defaults?.pickupAddress ?? "");
  const [contactName, setContactName] = React.useState(
    defaults?.pickupContactName ?? ""
  );
  const [contactPhone, setContactPhone] = React.useState(
    defaults?.pickupContactPhone ?? ""
  );

  // Prefill address/contact from the order's customer on selection.
  const onPickOrder = (orderId: string) => {
    const o = orders.find((x) => x.id === orderId);
    if (!o) return;
    if (address.trim() === "") setAddress(o.customer.address);
    if (contactName.trim() === "") setContactName(o.customer.name);
    if (contactPhone.trim() === "") setContactPhone(o.customer.phone);
  };

  return (
    <form action={formAction}>
      {state && !state.ok && state.formError ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}

      <FormSection title={"Đơn hàng & tài xế"} description={"Lệnh lấy hàng gắn với đơn nào, ai phụ trách."}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Đơn hàng"} htmlFor="orderId" required error={err("orderId")}>
            <Select
              id="orderId"
              name={lockOrder && defaults?.orderId ? undefined : "orderId"}
              defaultValue={defaults?.orderId ?? ""}
              disabled={lockOrder}
              onChange={(e) => onPickOrder(e.target.value)}
            >
              <option value="">--</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code + " - " + o.customer.code + " - " + o.customer.name}
                </option>
              ))}
            </Select>
            {lockOrder && defaults?.orderId ? (
              <input type="hidden" name="orderId" value={defaults.orderId} />
            ) : null}
          </Field>
          <Field label={"Tài xế"} htmlFor="driverId" error={err("driverId")}>
            <Select id="driverId" name="driverId" defaultValue={defaults?.driverId ?? ""}>
              <option value="">{"— Chưa phân công —"}</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user.name + " (" + d.phone + ")"}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection title={"Địa chỉ & liên hệ lấy hàng"} description={"Nơi lấy hàng và người liên hệ tại điểm lấy."}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Địa chỉ lấy hàng"} htmlFor="pickupAddress" required className="md:col-span-2" error={err("pickupAddress")}>
            <Textarea
              id="pickupAddress"
              name="pickupAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
            />
          </Field>
          <Field label={"Người liên hệ"} htmlFor="pickupContactName" required error={err("pickupContactName")}>
            <Input
              id="pickupContactName"
              name="pickupContactName"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label={"Số điện thoại liên hệ"} htmlFor="pickupContactPhone" required error={err("pickupContactPhone")}>
            <Input
              id="pickupContactPhone"
              name="pickupContactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              autoComplete="off"
              inputMode="tel"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title={"Lịch hẹn & trạng thái"} description={"Thời gian hẹn lấy và trạng thái xử lý."}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Thời gian hẹn lấy"} htmlFor="scheduledAt" error={err("scheduledAt")}>
            <Input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(defaults?.scheduledAt)}
            />
          </Field>
          <Field label={"Trạng thái"} htmlFor="currentStatus" required error={err("currentStatus")}>
            <Select id="currentStatus" name="currentStatus" defaultValue={defaults?.currentStatus ?? "PENDING"}>
              {PICKUP_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {PICKUP_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={"Ghi chú"} htmlFor="notes" className="md:col-span-2" error={err("notes")}>
            <Textarea id="notes" name="notes" defaultValue={defaults?.notes ?? ""} rows={3} />
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
