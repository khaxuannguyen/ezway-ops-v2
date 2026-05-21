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

export interface OrderPickerOption {
  id: string;
  code: string;
  customer: { code: string; name: string };
}

export interface PackageFormDefaults {
  orderId?: string;
  trackingCode?: string | null;
  description?: string | null;
  actualWeightKg?: number | string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface PackageFormProps {
  orders: OrderPickerOption[];
  defaults?: PackageFormDefaults;
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
  lockOrder?: boolean;
}

const DIVISOR = 5000;

export function PackageForm(props: PackageFormProps) {
  const { orders, defaults, action, submitLabel, lockOrder } = props;
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  const [actual, setActual] = React.useState<number>(
    Number(defaults?.actualWeightKg ?? 0)
  );
  const [l, setL] = React.useState<number>(Number(defaults?.lengthCm ?? 0));
  const [w, setW] = React.useState<number>(Number(defaults?.widthCm ?? 0));
  const [h, setH] = React.useState<number>(Number(defaults?.heightCm ?? 0));

  const vol = React.useMemo(() => {
    if (l > 0 && w > 0 && h > 0) {
      return Math.round(((l * w * h) / DIVISOR) * 100) / 100;
    }
    return 0;
  }, [l, w, h]);
  const chargeable = Math.max(actual || 0, vol || 0);

  return (
    <form action={formAction}>
      {state && !state.ok && state.formError ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}

      <FormSection
        title={"Liên kết đơn hàng"}
        description={"Chọn đơn hàng để gắn kiện hàng."}
      >
        <Field
          label={"Đơn hàng"}
          htmlFor="orderId"
          required
          error={err("orderId")}
        >
          <Select
            id="orderId"
            name={lockOrder && defaults?.orderId ? undefined : "orderId"}
            defaultValue={defaults?.orderId ?? ""}
            disabled={lockOrder}
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
      </FormSection>

      <FormSection
        title={"Kích thước & cân nặng"}
        description={"Số liệu để tính cân quy đổi và cân tính cước."}
      >
        <div className="grid gap-4 md:grid-cols-4">
          <Field
            label={"Cân thực (kg)"}
            htmlFor="actualWeightKg"
            required
            error={err("actualWeightKg")}
          >
            <Input
              id="actualWeightKg"
              name="actualWeightKg"
              type="number"
              step="0.01"
              min="0.01"
              value={actual || ""}
              onChange={(e) => setActual(Number(e.target.value))}
              inputMode="decimal"
            />
          </Field>
          <Field
            label={"Dài (cm)"}
            htmlFor="lengthCm"
            required
            error={err("lengthCm")}
          >
            <Input
              id="lengthCm"
              name="lengthCm"
              type="number"
              step="1"
              min="1"
              value={l || ""}
              onChange={(e) => setL(Number(e.target.value))}
              inputMode="numeric"
            />
          </Field>
          <Field
            label={"Rộng (cm)"}
            htmlFor="widthCm"
            required
            error={err("widthCm")}
          >
            <Input
              id="widthCm"
              name="widthCm"
              type="number"
              step="1"
              min="1"
              value={w || ""}
              onChange={(e) => setW(Number(e.target.value))}
              inputMode="numeric"
            />
          </Field>
          <Field
            label={"Cao (cm)"}
            htmlFor="heightCm"
            required
            error={err("heightCm")}
          >
            <Input
              id="heightCm"
              name="heightCm"
              type="number"
              step="1"
              min="1"
              value={h || ""}
              onChange={(e) => setH(Number(e.target.value))}
              inputMode="numeric"
            />
          </Field>
        </div>
        <div className="grid gap-3 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{"Cân quy đổi (kg)"}</span>
            <span className="font-medium tabular-nums">
              {vol.toFixed(2)} kg
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{"Cân tính cước (kg)"}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {chargeable.toFixed(2)} kg
            </span>
          </div>
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            {"Cân quy đổi = D x R x C / 5000. Cân tính cước = max(cân thực, cân quy đổi)."}
          </p>
        </div>
      </FormSection>

      <FormSection
        title={"Mô tả"}
        description={"Thông tin nhận diện kiện hàng (tuỳ chọn)."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={"Mã vận đơn"}
            htmlFor="trackingCode"
            error={err("trackingCode")}
          >
            <Input
              id="trackingCode"
              name="trackingCode"
              defaultValue={defaults?.trackingCode ?? ""}
              autoComplete="off"
            />
          </Field>
          <Field
            label={"Mô tả"}
            htmlFor="description"
            className="md:col-span-2"
            error={err("description")}
          >
            <Textarea
              id="description"
              name="description"
              defaultValue={defaults?.description ?? ""}
              rows={2}
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
