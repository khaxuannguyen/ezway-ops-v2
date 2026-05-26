"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field } from "@/components/shared/field";
import { FormSection } from "@/components/shared/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { CustomsExportType } from "@/app/generated/prisma/enums";
import type { RecipientLite } from "@/features/recipients/queries";

const EXPORT_TYPE_OPTIONS: { value: CustomsExportType; label: string }[] = [
  { value: "GIFT", label: "Gift (no commercial value)" },
  { value: "MERCHANDISE", label: "Merchandise (hàng thương mại)" },
  { value: "DOCUMENTS", label: "Documents (tài liệu)" },
  { value: "SAMPLE", label: "Sample (hàng mẫu)" },
  { value: "RETURN", label: "Return (hàng trả)" },
];

const UNIT_OPTIONS = ["Pcs", "Set", "Pair", "Box", "Kg", "Bottle"];

export interface InvoiceItemDefault {
  description: string;
  quantity: number;
  unit: string;
  unitPriceUsd: number;
}

export interface RecipientDefault {
  recipientId?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  country?: string | null;
  stateProvince?: string | null;
  city?: string | null;
  postalCode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressLine3?: string | null;
}

export interface CarrierForwardSectionProps {
  recipientOptions: RecipientLite[];
  defaults?: {
    customsExportType?: CustomsExportType;
    serviceTier?: string | null;
    requiresSignature?: boolean;
    branchCode?: string | null;
    invoiceItems?: InvoiceItemDefault[];
    recipient?: RecipientDefault;
  };
  errors?: Record<string, string | undefined>;
}

export function CarrierForwardSection({
  recipientOptions,
  defaults,
  errors,
}: CarrierForwardSectionProps) {
  const [selectedRecipientId, setSelectedRecipientId] = React.useState<string>(
    defaults?.recipient?.recipientId ?? ""
  );
  // Khi chọn người nhận cũ → ẩn form nhập tay.
  const isReuseMode = selectedRecipientId !== "";

  const [items, setItems] = React.useState<InvoiceItemDefault[]>(
    defaults?.invoiceItems && defaults.invoiceItems.length > 0
      ? defaults.invoiceItems
      : [{ description: "", quantity: 1, unit: "Pcs", unitPriceUsd: 0 }]
  );

  const totalUsd = items.reduce(
    (s, it) => s + Number((it.quantity * it.unitPriceUsd).toFixed(2)),
    0
  );

  const setItem = (i: number, patch: Partial<InvoiceItemDefault>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unit: "Pcs", unitPriceUsd: 0 },
    ]);
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <>
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
                  " (" +
                  r.country +
                  (r.companyName ? " · " + r.companyName : "") +
                  ")"}
              </option>
            ))}
          </Select>
        </Field>

        {!isReuseMode ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={"Tên người nhận (Contact Name)"}
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
              <Field label={"Công ty (Company)"} htmlFor="recipient.companyName">
                <Input
                  id="recipient.companyName"
                  name="recipient.companyName"
                  defaultValue={defaults?.recipient?.companyName ?? ""}
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
              <Field label={"Email (tuỳ chọn)"} htmlFor="recipient.email">
                <Input
                  id="recipient.email"
                  name="recipient.email"
                  type="email"
                  defaultValue={defaults?.recipient?.email ?? ""}
                />
              </Field>
              <Field
                label={"Quốc gia (ISO code: US, DE, GB...)"}
                htmlFor="recipient.country"
                required
                error={errors?.["recipient.country"]}
              >
                <Input
                  id="recipient.country"
                  name="recipient.country"
                  maxLength={2}
                  defaultValue={defaults?.recipient?.country ?? ""}
                  placeholder="US"
                />
              </Field>
              <Field
                label={"Tỉnh/Bang (State/Province)"}
                htmlFor="recipient.stateProvince"
              >
                <Input
                  id="recipient.stateProvince"
                  name="recipient.stateProvince"
                  defaultValue={defaults?.recipient?.stateProvince ?? ""}
                />
              </Field>
              <Field
                label={"Thành phố (City)"}
                htmlFor="recipient.city"
                required
                error={errors?.["recipient.city"]}
              >
                <Input
                  id="recipient.city"
                  name="recipient.city"
                  defaultValue={defaults?.recipient?.city ?? ""}
                />
              </Field>
              <Field
                label={"Mã bưu chính (Postal Code)"}
                htmlFor="recipient.postalCode"
                required
                error={errors?.["recipient.postalCode"]}
              >
                <Input
                  id="recipient.postalCode"
                  name="recipient.postalCode"
                  defaultValue={defaults?.recipient?.postalCode ?? ""}
                />
              </Field>
            </div>

            <Field
              label={"Địa chỉ dòng 1"}
              htmlFor="recipient.addressLine1"
              required
              error={errors?.["recipient.addressLine1"]}
            >
              <Input
                id="recipient.addressLine1"
                name="recipient.addressLine1"
                defaultValue={defaults?.recipient?.addressLine1 ?? ""}
              />
            </Field>
            <Field
              label={"Địa chỉ dòng 2 (tuỳ chọn)"}
              htmlFor="recipient.addressLine2"
            >
              <Input
                id="recipient.addressLine2"
                name="recipient.addressLine2"
                defaultValue={defaults?.recipient?.addressLine2 ?? ""}
              />
            </Field>
            <Field
              label={"Địa chỉ dòng 3 (tuỳ chọn)"}
              htmlFor="recipient.addressLine3"
            >
              <Input
                id="recipient.addressLine3"
                name="recipient.addressLine3"
                defaultValue={defaults?.recipient?.addressLine3 ?? ""}
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

      <FormSection title={"Khai báo Invoice (cho carrier)"}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={"Loại khai báo"} htmlFor="customsExportType">
            <Select
              id="customsExportType"
              name="customsExportType"
              defaultValue={defaults?.customsExportType ?? "GIFT"}
            >
              {EXPORT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={"Service tier (Kango: Chuyên tuyến...)"} htmlFor="serviceTier">
            <Input
              id="serviceTier"
              name="serviceTier"
              defaultValue={defaults?.serviceTier ?? ""}
              placeholder="Chuyên tuyến"
            />
          </Field>
          <Field label={"Chi nhánh xử lý"} htmlFor="branchCode">
            <Input
              id="branchCode"
              name="branchCode"
              defaultValue={defaults?.branchCode ?? "HCM"}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="requiresSignature"
            defaultChecked={defaults?.requiresSignature ?? false}
            className="h-4 w-4"
          />
          {"Dịch vụ chữ ký người nhận"}
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{"Goods Details (mặt hàng khai báo)"}</p>
            <Button type="button" size="sm" variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4" aria-hidden />
              {"Thêm mặt hàng"}
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-md border border-border bg-muted/20 p-3 sm:grid-cols-[1fr_80px_80px_120px_120px_40px]"
              >
                <Field
                  label={i === 0 ? "Mô tả (EN)" : ""}
                  htmlFor={`invoiceItem[${i}][description]`}
                >
                  <Input
                    id={`invoiceItem[${i}][description]`}
                    name={`invoiceItem[${i}][description]`}
                    value={it.description}
                    onChange={(e) => setItem(i, { description: e.target.value })}
                    placeholder="Cotton T-shirt women"
                  />
                </Field>
                <Field
                  label={i === 0 ? "Qty" : ""}
                  htmlFor={`invoiceItem[${i}][quantity]`}
                >
                  <Input
                    id={`invoiceItem[${i}][quantity]`}
                    name={`invoiceItem[${i}][quantity]`}
                    type="number"
                    min={1}
                    step={1}
                    value={it.quantity}
                    onChange={(e) =>
                      setItem(i, { quantity: Number(e.target.value || 0) })
                    }
                  />
                </Field>
                <Field
                  label={i === 0 ? "Unit" : ""}
                  htmlFor={`invoiceItem[${i}][unit]`}
                >
                  <Select
                    id={`invoiceItem[${i}][unit]`}
                    name={`invoiceItem[${i}][unit]`}
                    value={it.unit}
                    onChange={(e) => setItem(i, { unit: e.target.value })}
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label={i === 0 ? "Đơn giá USD" : ""}
                  htmlFor={`invoiceItem[${i}][unitPriceUsd]`}
                >
                  <Input
                    id={`invoiceItem[${i}][unitPriceUsd]`}
                    name={`invoiceItem[${i}][unitPriceUsd]`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.unitPriceUsd}
                    onChange={(e) =>
                      setItem(i, { unitPriceUsd: Number(e.target.value || 0) })
                    }
                  />
                </Field>
                <div>
                  {i === 0 && (
                    <span className="block pb-1.5 text-sm font-medium text-foreground">
                      {"Total"}
                    </span>
                  )}
                  <div className="flex h-9 items-center text-sm tabular-nums">
                    {"$" +
                      (it.quantity * it.unitPriceUsd).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                  </div>
                </div>
                <div className={i === 0 ? "self-end" : ""}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                    aria-label={"Xoá"}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-right text-sm font-medium tabular-nums">
            {"Tổng giá trị khai báo: $"}
            {totalUsd.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </FormSection>
    </>
  );
}
