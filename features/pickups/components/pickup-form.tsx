"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { Field } from "@/components/shared/field";
import { FormSection } from "@/components/shared/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { fieldError, type ActionResult } from "@/lib/action-result";
import { PICKUP_STATUS_LABEL, PICKUP_STATUS_OPTIONS } from "@/lib/enum-labels";
import {
  computePackageWeights,
  calculateOrderPackageTotals,
} from "@/lib/domain";
import type { PickupStatus } from "@/app/generated/prisma/enums";

export interface DriverPickerOption {
  id: string;
  phone: string;
  user: { name: string };
}

export interface PackageRowDefault {
  actualWeightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  description: string;
}

export interface PickupFormDefaults {
  driverId?: string | null;
  pickupAddress?: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  scheduledAt?: Date | string | null;
  notes?: string | null;
  currentStatus?: PickupStatus;
  packages?: PackageRowDefault[];
}

export interface PickupFormProps {
  drivers: DriverPickerOption[];
  defaults?: PickupFormDefaults;
  /** Hiện ô gán tài xế + trạng thái (ADMIN/STAFF). SALE = false. */
  showDispatch?: boolean;
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

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

interface PackageRow {
  key: string;
  actualWeightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  description: string;
}

function emptyRow(): PackageRow {
  return {
    key: uid(),
    actualWeightKg: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    description: "",
  };
}

function initialRows(defaults?: PackageRowDefault[]): PackageRow[] {
  if (defaults && defaults.length > 0) {
    return defaults.map((d) => ({ key: uid(), ...d }));
  }
  return [emptyRow()];
}

export function PickupForm({
  drivers,
  defaults,
  showDispatch = true,
  action,
  submitLabel,
}: PickupFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  const [rows, setRows] = React.useState<PackageRow[]>(() =>
    initialRows(defaults?.packages)
  );
  const [address, setAddress] = React.useState(defaults?.pickupAddress ?? "");
  const [contactName, setContactName] = React.useState(
    defaults?.pickupContactName ?? ""
  );
  const [contactPhone, setContactPhone] = React.useState(
    defaults?.pickupContactPhone ?? ""
  );

  const computed = React.useMemo(
    () =>
      rows.map((r) => {
        const a = Number(r.actualWeightKg);
        const l = Number(r.lengthCm);
        const w = Number(r.widthCm);
        const h = Number(r.heightCm);
        if (!(a > 0) || !(l > 0) || !(w > 0) || !(h > 0)) {
          return {
            actualWeightKg: 0,
            volumetricWeightKg: 0,
            chargeableWeightKg: 0,
            quantity: 1,
          };
        }
        return computePackageWeights({
          actualWeightKg: a,
          lengthCm: l,
          widthCm: w,
          heightCm: h,
        });
      }),
    [rows]
  );
  const totals = React.useMemo(
    () => calculateOrderPackageTotals(computed),
    [computed]
  );

  const updateRow = (key: string, patch: Partial<PackageRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (key: string) =>
    setRows((prev) =>
      prev.length > 1 ? prev.filter((r) => r.key !== key) : prev
    );

  return (
    <form action={formAction}>
      {state && !state.ok && state.formError ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}
      {state && !state.ok && state.fieldErrors?.packages ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.fieldErrors.packages[0]}
        </div>
      ) : null}

      <FormSection
        title={"Địa chỉ & liên hệ lấy hàng"}
        description={"Nơi lấy hàng và người liên hệ tại điểm lấy."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={"Địa chỉ lấy hàng"}
            htmlFor="pickupAddress"
            required
            className="md:col-span-2"
            error={err("pickupAddress")}
          >
            <Textarea
              id="pickupAddress"
              name="pickupAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
            />
          </Field>
          <Field
            label={"Người liên hệ"}
            htmlFor="pickupContactName"
            required
            error={err("pickupContactName")}
          >
            <Input
              id="pickupContactName"
              name="pickupContactName"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field
            label={"Số điện thoại liên hệ"}
            htmlFor="pickupContactPhone"
            required
            error={err("pickupContactPhone")}
          >
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

      <FormSection
        title={"Kiện hàng"}
        description={
          "Cân & đo từng thùng tại điểm lấy. Cân quy đổi tạm tính theo hệ số 5000 — " +
          "cước chính thức tính lại theo dịch vụ khi tạo đơn."
        }
      >
        <div className="space-y-4">
          {rows.map((row, i) => {
            const c = computed[i];
            return (
              <div
                key={row.key}
                className="space-y-3 rounded-md border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {"Kiện #" + (i + 1)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(row.key)}
                    disabled={rows.length <= 1}
                    aria-label={"Xóa"}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    <span className="ml-1">{"Xóa"}</span>
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <Field label={"Cân thực (kg)"} htmlFor={"pkg-a-" + row.key} required>
                    <Input
                      id={"pkg-a-" + row.key}
                      name={"packages[" + i + "][actualWeightKg]"}
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={row.actualWeightKg}
                      onChange={(e) =>
                        updateRow(row.key, { actualWeightKg: e.target.value })
                      }
                      inputMode="decimal"
                    />
                  </Field>
                  <Field label={"Dài (cm)"} htmlFor={"pkg-l-" + row.key} required>
                    <Input
                      id={"pkg-l-" + row.key}
                      name={"packages[" + i + "][lengthCm]"}
                      type="number"
                      step="1"
                      min="1"
                      value={row.lengthCm}
                      onChange={(e) =>
                        updateRow(row.key, { lengthCm: e.target.value })
                      }
                      inputMode="numeric"
                    />
                  </Field>
                  <Field label={"Rộng (cm)"} htmlFor={"pkg-w-" + row.key} required>
                    <Input
                      id={"pkg-w-" + row.key}
                      name={"packages[" + i + "][widthCm]"}
                      type="number"
                      step="1"
                      min="1"
                      value={row.widthCm}
                      onChange={(e) =>
                        updateRow(row.key, { widthCm: e.target.value })
                      }
                      inputMode="numeric"
                    />
                  </Field>
                  <Field label={"Cao (cm)"} htmlFor={"pkg-h-" + row.key} required>
                    <Input
                      id={"pkg-h-" + row.key}
                      name={"packages[" + i + "][heightCm]"}
                      type="number"
                      step="1"
                      min="1"
                      value={row.heightCm}
                      onChange={(e) =>
                        updateRow(row.key, { heightCm: e.target.value })
                      }
                      inputMode="numeric"
                    />
                  </Field>
                </div>
                <Field label={"Mô tả (tuỳ chọn)"} htmlFor={"pkg-d-" + row.key}>
                  <Textarea
                    id={"pkg-d-" + row.key}
                    name={"packages[" + i + "][description]"}
                    value={row.description}
                    onChange={(e) =>
                      updateRow(row.key, { description: e.target.value })
                    }
                    rows={2}
                  />
                </Field>
                <div className="grid gap-2 rounded bg-muted/40 px-3 py-2 text-xs sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {"Cân quy đổi (tạm)"}
                    </span>
                    <span className="font-medium tabular-nums">
                      {c.volumetricWeightKg.toFixed(2) + " kg"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {"Cân tính cước (tạm)"}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {c.chargeableWeightKg.toFixed(2) + " kg"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="outline" onClick={addRow}>
            <Plus className="h-4 w-4" aria-hidden />
            <span className="ml-1">{"Thêm kiện"}</span>
          </Button>

          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {"Tổng cộng"}
            </p>
            <div className="grid gap-1 sm:grid-cols-2">
              <Row label={"Số kiện"} value={totals.packageCount.toString()} />
              <Row
                label={"Tổng cân thực"}
                value={totals.totalActualWeight.toFixed(2) + " kg"}
              />
              <Row
                label={"Tổng cân quy đổi (tạm)"}
                value={totals.totalVolumetricWeight.toFixed(2) + " kg"}
              />
              <Row
                label={"Tổng cân tính cước (tạm)"}
                value={totals.totalChargeableWeight.toFixed(2) + " kg"}
                bold
              />
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection
        title={showDispatch ? "Lịch hẹn & phân công" : "Lịch hẹn lấy hàng"}
        description={"Thời gian hẹn lấy hàng tại điểm khách."}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={"Thời gian hẹn lấy"}
            htmlFor="scheduledAt"
            error={err("scheduledAt")}
            className={showDispatch ? undefined : "md:col-span-2"}
          >
            <Input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(defaults?.scheduledAt)}
            />
          </Field>
          {showDispatch ? (
            <Field label={"Trạng thái"} htmlFor="currentStatus" required error={err("currentStatus")}>
              <Select
                id="currentStatus"
                name="currentStatus"
                defaultValue={defaults?.currentStatus ?? "PENDING"}
              >
                {PICKUP_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {PICKUP_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {showDispatch ? (
            <Field label={"Tài xế"} htmlFor="driverId" error={err("driverId")}>
              <Select
                id="driverId"
                name="driverId"
                defaultValue={defaults?.driverId ?? ""}
              >
                <option value="">{"— Chưa phân công —"}</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user.name + " (" + d.phone + ")"}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
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

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          (bold ? "font-semibold text-foreground" : "font-medium") +
          " tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}
