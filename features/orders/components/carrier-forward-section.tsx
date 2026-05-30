"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field } from "@/components/shared/field";
import { FormSection } from "@/components/shared/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { RecipientLite } from "@/features/recipients/queries";

/** Tóm tắt customer (sender VN) — hiển thị read-only. */
export interface SenderSummary {
  name: string;
  phone: string;
  address: string;
  nationalId: string | null;
}

export interface RecipientDefault {
  recipientId?: string | null;
  contactName?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface PackageRowDefault {
  description?: string;
  quantity?: string | number;
  packageType?: "CARTON" | "PALLET" | "ENVELOPE";
  actualWeightKg?: string | number;
  lengthCm?: string | number;
  widthCm?: string | number;
  heightCm?: string | number;
}

export interface OpsUserOption {
  id: string;
  name: string;
  role: string;
}

export interface CarrierForwardSectionProps {
  /** Tóm tắt Customer (sender) đang chọn. Null khi sale chưa chọn customer. */
  sender: SenderSummary | null;
  recipientOptions: RecipientLite[];
  opsUsers: OpsUserOption[];
  defaults?: {
    recipient?: RecipientDefault;
    assignedToUserId?: string | null;
    packages?: PackageRowDefault[];
    pickupCode?: string | null;
  };
  /** Show bill packages repeater + pickup section. False khi form Update. */
  showPackages?: boolean;
  errors?: Record<string, string | undefined>;
  /**
   * Hệ số cân quy đổi của Service (cm³ → kg). Mặc định 5000 nếu chưa chọn dịch vụ.
   * Cân tính cước = max(cân thực, D×R×C / volumetricDivisor).
   */
  volumetricDivisor?: number;
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

type PkgType = "CARTON" | "PALLET" | "ENVELOPE";

interface PkgRow {
  key: string;
  description: string;
  quantity: string;
  packageType: PkgType;
  actualWeightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
}

function emptyPkgRow(): PkgRow {
  return {
    key: uid(),
    description: "",
    quantity: "1",
    packageType: "CARTON",
    actualWeightKg: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
  };
}

const PKG_TYPE_LABEL: Record<PkgType, string> = {
  CARTON: "Carton",
  PALLET: "Pallet",
  ENVELOPE: "Túi (phong bì)",
};

const CM_TO_INCH = 0.393701;
const KG_TO_LB = 2.20462;
const fmtInch = (cm: number): string =>
  cm > 0 ? (cm * CM_TO_INCH).toFixed(2) + " in" : "0.00 in";
const fmtLb = (kg: number): string =>
  kg > 0 ? (kg * KG_TO_LB).toFixed(2) + " lb" : "0.00 lb";
const fmtCbm = (cbm: number): string =>
  cbm > 0
    ? cbm.toLocaleString("en-US", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 4,
      }) + " m³"
    : "0.000 m³";

/** Tính cân thể tích + cân tính cước cho 1 row. Số rỗng/sai → 0. */
function computeDimWeight(
  row: { actualWeightKg: string; lengthCm: string; widthCm: string; heightCm: string },
  divisor: number
): { actual: number; volumetric: number; chargeable: number } {
  const actual = Number(row.actualWeightKg) || 0;
  const l = Number(row.lengthCm) || 0;
  const w = Number(row.widthCm) || 0;
  const h = Number(row.heightCm) || 0;
  const volumetric = divisor > 0 ? (l * w * h) / divisor : 0;
  const chargeable = Math.max(actual, volumetric);
  return { actual, volumetric, chargeable };
}

const fmtKg = (n: number): string =>
  n > 0
    ? n.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kg"
    : "—";

export function CarrierForwardSection({
  sender,
  recipientOptions,
  opsUsers,
  defaults,
  showPackages = true,
  errors,
  volumetricDivisor = 5000,
}: CarrierForwardSectionProps) {
  const [selectedRecipientId, setSelectedRecipientId] = React.useState<string>(
    defaults?.recipient?.recipientId ?? ""
  );
  const isReuseMode = selectedRecipientId !== "";

  const [hasPickup, setHasPickup] = React.useState<boolean>(
    !!(defaults?.pickupCode && defaults.pickupCode.trim() !== "")
  );

  const [pkgRows, setPkgRows] = React.useState<PkgRow[]>(() => {
    if (defaults?.packages && defaults.packages.length > 0) {
      return defaults.packages.map((p) => ({
        key: uid(),
        description: (p.description ?? "").toString(),
        quantity: (p.quantity ?? 1).toString(),
        packageType: (p.packageType ?? "CARTON") as PkgType,
        actualWeightKg: (p.actualWeightKg ?? "").toString(),
        lengthCm: (p.lengthCm ?? "").toString(),
        widthCm: (p.widthCm ?? "").toString(),
        heightCm: (p.heightCm ?? "").toString(),
      }));
    }
    return [emptyPkgRow()];
  });

  const setPkg = (idx: number, patch: Partial<PkgRow>) =>
    setPkgRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  const addPkg = () => setPkgRows((prev) => [...prev, emptyPkgRow()]);
  const removePkg = (idx: number) =>
    setPkgRows((prev) => prev.filter((_, i) => i !== idx));

  return (
    <>
      <FormSection
        title={"Người gửi (Sender)"}
        description={"Lấy từ Khách hàng — read-only."}
      >
        {sender ? (
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <Info label={"Họ tên"}>{sender.name}</Info>
              <Info label={"Số điện thoại"}>{sender.phone}</Info>
              <Info label={"CCCD"}>
                {sender.nationalId ? (
                  sender.nationalId
                ) : (
                  <span className="text-warning">
                    {"(chưa có — cập nhật profile khách)"}
                  </span>
                )}
              </Info>
              <Info label={"Địa chỉ"} className="sm:col-span-2">
                <span className="whitespace-pre-line">
                  {sender.address || "—"}
                </span>
              </Info>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {
                "Nếu thông tin người gửi sai/thiếu, vào /admin/customers/<khách> → Chỉnh sửa."
              }
            </p>
          </div>
        ) : (
          <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
            {"Chọn Khách hàng phía trên để hiển thị Người gửi."}
          </p>
        )}
      </FormSection>

      <FormSection title={"Người nhận (Recipient)"}>
        <Field
          label={"Chọn người nhận đã lưu (tuỳ chọn)"}
          htmlFor="recipient.recipientId"
        >
          <Select
            id="recipient.recipientId"
            name="recipient.recipientId"
            value={selectedRecipientId}
            onChange={(e) => setSelectedRecipientId(e.target.value)}
          >
            <option value="">{"-- Tạo người nhận mới --"}</option>
            {recipientOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.contactName +
                  " - " +
                  r.phone +
                  (r.companyName ? " · " + r.companyName : "")}
              </option>
            ))}
          </Select>
        </Field>

        {!isReuseMode ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={"Họ tên"}
                htmlFor="recipient.contactName"
                required
                error={errors?.["recipient.contactName"]}
              >
                <Input
                  id="recipient.contactName"
                  name="recipient.contactName"
                  defaultValue={defaults?.recipient?.contactName ?? ""}
                />
              </Field>
              <Field
                label={"Số điện thoại"}
                htmlFor="recipient.phone"
                required
                error={errors?.["recipient.phone"]}
              >
                <Input
                  id="recipient.phone"
                  name="recipient.phone"
                  defaultValue={defaults?.recipient?.phone ?? ""}
                />
              </Field>
            </div>
            <Field
              label={"Địa chỉ"}
              htmlFor="recipient.address"
              required
              error={errors?.["recipient.address"]}
            >
              <Textarea
                id="recipient.address"
                name="recipient.address"
                rows={3}
                defaultValue={defaults?.recipient?.address ?? ""}
                placeholder={
                  "Số nhà, đường, thành phố, bang/tỉnh, mã bưu chính, quốc gia..."
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="recipient.saveAsReusable"
                defaultChecked={true}
                className="h-4 w-4"
              />
              {"Lưu người nhận này để tái sử dụng lần sau"}
            </label>
          </>
        ) : (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {"Đang dùng người nhận đã lưu. Chọn '-- Tạo người nhận mới --' để nhập tay."}
          </p>
        )}
      </FormSection>

      <FormSection
        title={"Người phụ trách (OPS)"}
        description={"Nhân viên đóng hàng / tài xế pickup. SALE gán để tính hoa hồng."}
      >
        <Field label={"Chọn người phụ trách"} htmlFor="assignedToUserId">
          <Select
            id="assignedToUserId"
            name="assignedToUserId"
            defaultValue={defaults?.assignedToUserId ?? ""}
          >
            <option value="">{"-- Chưa gán --"}</option>
            {opsUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name + " (" + u.role + ")"}
              </option>
            ))}
          </Select>
        </Field>
      </FormSection>

      {showPackages ? (
        <>
          <FormSection
            title={"Pickup (lệnh lấy hàng)"}
            description={
              "Nếu đã có lệnh pickup riêng từ trước — tick và nhập mã (chỉ là reference text, không thay thế thông tin kiện hàng bên dưới)."
            }
          >
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasPickup}
                onChange={(e) => setHasPickup(e.target.checked)}
                className="h-4 w-4"
              />
              {"Có pickup từ trước"}
            </label>
            {hasPickup ? (
              <Field label={"Mã pickup (PK-...)"} htmlFor="pickupCode">
                <Input
                  id="pickupCode"
                  name="pickupCode"
                  defaultValue={defaults?.pickupCode ?? ""}
                  placeholder="PK-2605-0001"
                />
              </Field>
            ) : (
              <input type="hidden" name="pickupCode" value="" />
            )}
          </FormSection>

          <FormSection
            title={"Thông tin kiện hàng"}
            description={
              `Cân tính cước = max(cân thực, D×R×C / ${volumetricDivisor}) × số kiện. CBM = D×R×C / 1.000.000.`
            }
          >
            <div className="space-y-3">
              {errors?.packages ? (
                <p className="text-xs text-destructive">{errors.packages}</p>
              ) : null}

              {pkgRows.map((row, i) => {
                const w = computeDimWeight(row, volumetricDivisor);
                const qty = Math.max(1, Number(row.quantity) || 1);
                const l = Number(row.lengthCm) || 0;
                const wd = Number(row.widthCm) || 0;
                const h = Number(row.heightCm) || 0;
                const cbmPer = (l * wd * h) / 1_000_000;
                const cbmTotal = cbmPer * qty;
                const chargedTotal = w.chargeable * qty;
                const useVolumetric =
                  w.volumetric > w.actual && w.volumetric > 0;
                return (
                  <div
                    key={row.key}
                    className="rounded-md border border-border bg-muted/20 p-3"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {`Kiện #${i + 1}`}
                      </span>
                      <Input
                        id={`orderPkg[${i}][description]`}
                        name={`orderPkg[${i}][description]`}
                        value={row.description}
                        onChange={(e) =>
                          setPkg(i, { description: e.target.value })
                        }
                        placeholder="Tên hàng hoá (áo thun, mỹ phẩm, sách...)"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePkg(i)}
                        disabled={pkgRows.length === 1}
                        aria-label="Xoá kiện"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                      </Button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[70px_120px_repeat(4,1fr)_110px_110px]">
                      <PkgCell
                        label="Số kiện"
                        showLabel={i === 0}
                        hint={qty > 1 ? `× ${qty}` : null}
                      >
                        <Input
                          id={`orderPkg[${i}][quantity]`}
                          name={`orderPkg[${i}][quantity]`}
                          type="number"
                          min={1}
                          step={1}
                          value={row.quantity}
                          onChange={(e) =>
                            setPkg(i, { quantity: e.target.value })
                          }
                        />
                      </PkgCell>
                      <PkgCell label="Type" showLabel={i === 0}>
                        <Select
                          id={`orderPkg[${i}][packageType]`}
                          name={`orderPkg[${i}][packageType]`}
                          value={row.packageType}
                          onChange={(e) =>
                            setPkg(i, {
                              packageType: e.target.value as PkgType,
                            })
                          }
                        >
                          <option value="CARTON">{PKG_TYPE_LABEL.CARTON}</option>
                          <option value="PALLET">{PKG_TYPE_LABEL.PALLET}</option>
                          <option value="ENVELOPE">
                            {PKG_TYPE_LABEL.ENVELOPE}
                          </option>
                        </Select>
                      </PkgCell>
                      <PkgCell
                        label="Dài (cm)"
                        showLabel={i === 0}
                        hint={`= ${fmtInch(l)}`}
                      >
                        <Input
                          id={`orderPkg[${i}][lengthCm]`}
                          name={`orderPkg[${i}][lengthCm]`}
                          type="number"
                          min={1}
                          step={1}
                          value={row.lengthCm}
                          onChange={(e) =>
                            setPkg(i, { lengthCm: e.target.value })
                          }
                        />
                      </PkgCell>
                      <PkgCell
                        label="Rộng (cm)"
                        showLabel={i === 0}
                        hint={`= ${fmtInch(wd)}`}
                      >
                        <Input
                          id={`orderPkg[${i}][widthCm]`}
                          name={`orderPkg[${i}][widthCm]`}
                          type="number"
                          min={1}
                          step={1}
                          value={row.widthCm}
                          onChange={(e) =>
                            setPkg(i, { widthCm: e.target.value })
                          }
                        />
                      </PkgCell>
                      <PkgCell
                        label="Cao (cm)"
                        showLabel={i === 0}
                        hint={`= ${fmtInch(h)}`}
                      >
                        <Input
                          id={`orderPkg[${i}][heightCm]`}
                          name={`orderPkg[${i}][heightCm]`}
                          type="number"
                          min={1}
                          step={1}
                          value={row.heightCm}
                          onChange={(e) =>
                            setPkg(i, { heightCm: e.target.value })
                          }
                        />
                      </PkgCell>
                      <PkgCell
                        label="Cân thực (kg)"
                        showLabel={i === 0}
                        hint={`= ${fmtLb(w.actual)}`}
                      >
                        <Input
                          id={`orderPkg[${i}][actualWeightKg]`}
                          name={`orderPkg[${i}][actualWeightKg]`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.actualWeightKg}
                          onChange={(e) =>
                            setPkg(i, { actualWeightKg: e.target.value })
                          }
                        />
                      </PkgCell>
                      <PkgCell
                        label="Tính cước (kg)"
                        showLabel={i === 0}
                        hint={
                          useVolumetric
                            ? "theo thể tích"
                            : w.actual > 0
                              ? "theo cân thực"
                              : null
                        }
                      >
                        <div
                          className="flex h-9 items-center rounded-md border border-primary/30 bg-primary/5 px-2.5 text-xs font-semibold text-primary"
                          aria-label="Cân tính cước"
                        >
                          {fmtKg(chargedTotal)}
                        </div>
                      </PkgCell>
                      <PkgCell label="CBM" showLabel={i === 0}>
                        <div
                          className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-2.5 text-xs text-muted-foreground"
                          aria-label="Charged CBM"
                        >
                          {fmtCbm(cbmTotal)}
                        </div>
                      </PkgCell>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPkg}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {"Thêm kiện hàng"}
              </Button>

              {(() => {
                const totals = pkgRows.reduce(
                  (acc, row) => {
                    const w = computeDimWeight(row, volumetricDivisor);
                    const q = Math.max(1, Number(row.quantity) || 1);
                    acc.count += q;
                    acc.actual += w.actual * q;
                    acc.volumetric += w.volumetric * q;
                    acc.chargeable += w.chargeable * q;
                    acc.cbm +=
                      ((Number(row.lengthCm) || 0) *
                        (Number(row.widthCm) || 0) *
                        (Number(row.heightCm) || 0) *
                        q) /
                      1_000_000;
                    return acc;
                  },
                  { count: 0, actual: 0, volumetric: 0, chargeable: 0, cbm: 0 }
                );
                if (totals.chargeable <= 0) return null;
                const usingVolumetric = totals.volumetric > totals.actual;
                return (
                  <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                    <span>
                      {"Số kiện: "}
                      <span className="font-semibold">{totals.count}</span>
                    </span>
                    <span>
                      {"Cân thực: "}
                      <span className="font-semibold">
                        {fmtKg(totals.actual)}
                      </span>
                    </span>
                    <span>
                      {"Cân thể tích: "}
                      <span
                        className={
                          usingVolumetric
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {fmtKg(totals.volumetric)}
                      </span>
                    </span>
                    <span>
                      {"Tổng CBM: "}
                      <span className="font-mono">{fmtCbm(totals.cbm)}</span>
                    </span>
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">
                      {"Tính cước: "}
                      <span className="font-bold">
                        {fmtKg(totals.chargeable)}
                      </span>
                      <span className="ml-1 text-[10px] text-primary/70">
                        {usingVolumetric ? "(theo thể tích)" : "(theo cân thực)"}
                      </span>
                    </span>
                  </div>
                );
              })()}
            </div>
          </FormSection>
        </>
      ) : null}
    </>
  );
}

function PkgCell({
  label,
  showLabel,
  hint,
  children,
}: {
  label: string;
  showLabel: boolean;
  hint?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      {showLabel ? (
        <label className="text-[11px] font-medium text-muted-foreground">
          {label}
        </label>
      ) : null}
      {children}
      {hint ? (
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}

function Info({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}
