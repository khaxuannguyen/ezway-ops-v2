"use client";

import * as React from "react";
import { useActionState } from "react";
import { Copy, Check } from "lucide-react";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fieldError, type ActionResult } from "@/lib/action-result";

const CARRIER_OPTIONS = ["KANGO", "KSN", "GO", "OTHER"];

/** Render 1 field với nút click-to-copy. */
function CopyableField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("clipboard error", err);
    }
  };
  if (!value) {
    return (
      <div className="grid gap-1 sm:grid-cols-[180px_1fr_auto] sm:items-start">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-sm text-muted-foreground italic">{"(trống)"}</span>
        <div />
      </div>
    );
  }
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_1fr_auto] sm:items-start">
      <span className="pt-1 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div
        className={
          "rounded-md border border-border bg-muted/30 px-3 py-2 text-sm " +
          (multiline ? "whitespace-pre-wrap" : "")
        }
      >
        {value}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCopy}
        className="shrink-0"
        aria-label={"Copy " + label}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden />
            <span className="ml-1 text-xs">{"Đã copy"}</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden />
            <span className="ml-1 text-xs">{"Copy"}</span>
          </>
        )}
      </Button>
    </div>
  );
}

/** Bảng với nút copy as TSV (paste vào Excel/portal Kango). */
function CopyableTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  const [copied, setCopied] = React.useState(false);
  const tsv =
    columns.join("\t") +
    "\n" +
    rows.map((r) => r.map((c) => String(c)).join("\t")).join("\n");
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("clipboard error", err);
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        <Button type="button" variant="outline" size="sm" onClick={onCopy}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden />
              <span className="ml-1 text-xs">{"Đã copy bảng"}</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              <span className="ml-1 text-xs">{"Copy bảng (TSV)"}</span>
            </>
          )}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-3 py-2 text-left font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-3 text-center text-xs text-muted-foreground"
                  colSpan={columns.length}
                >
                  {"(không có dữ liệu)"}
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  {r.map((cell, j) => (
                    <td key={j} className="px-3 py-2 tabular-nums">
                      {String(cell)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface CarrierCopyHelperProps {
  orderCode: string;
  sender: {
    companyName: string;
    contactName: string;
    phone: string;
    address: string;
  };
  recipient: {
    companyName: string | null;
    contactName: string;
    phone: string;
    email: string | null;
    country: string;
    stateProvince: string | null;
    city: string;
    postalCode: string;
    addressLine1: string;
    addressLine2: string | null;
    addressLine3: string | null;
  } | null;
  orderInfo: {
    serviceTier: string | null;
    requiresSignature: boolean;
    branchCode: string | null;
    customsExportType: string;
  };
  packages: {
    description: string | null;
    actualWeightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  }[];
  invoiceItems: {
    description: string;
    quantity: number;
    unit: string;
    unitPriceUsd: number;
    totalValueUsd: number;
  }[];
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
}

export function CarrierCopyHelper({
  orderCode,
  sender,
  recipient,
  orderInfo,
  packages,
  invoiceItems,
  action,
}: CarrierCopyHelperProps) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);
  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{"1. Người gửi (Sender)"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <CopyableField label={"Công ty"} value={sender.companyName} />
          <CopyableField label={"Người liên hệ"} value={sender.contactName} />
          <CopyableField label={"Số điện thoại"} value={sender.phone} />
          <CopyableField label={"Địa chỉ"} value={sender.address} multiline />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{"2. Người nhận (Receiver)"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recipient ? (
            <>
              <CopyableField
                label={"Công ty"}
                value={recipient.companyName ?? ""}
              />
              <CopyableField label={"Contact Name"} value={recipient.contactName} />
              <CopyableField label={"Phone"} value={recipient.phone} />
              <CopyableField label={"Email"} value={recipient.email ?? ""} />
              <CopyableField label={"Country (ISO)"} value={recipient.country} />
              <CopyableField
                label={"State/Province"}
                value={recipient.stateProvince ?? ""}
              />
              <CopyableField label={"City"} value={recipient.city} />
              <CopyableField label={"Postal Code"} value={recipient.postalCode} />
              <CopyableField label={"Address 1"} value={recipient.addressLine1} />
              <CopyableField
                label={"Address 2"}
                value={recipient.addressLine2 ?? ""}
              />
              <CopyableField
                label={"Address 3"}
                value={recipient.addressLine3 ?? ""}
              />
            </>
          ) : (
            <p className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-sm text-warning">
              {"Đơn này chưa có người nhận. Vào /admin/orders/<id>/edit để bổ sung."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{"3. Thông tin đơn hàng"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <CopyableField label={"Reference / Order Code"} value={orderCode} />
          <CopyableField
            label={"Service tier"}
            value={orderInfo.serviceTier ?? ""}
          />
          <CopyableField label={"Branch"} value={orderInfo.branchCode ?? ""} />
          <CopyableField
            label={"Chữ ký người nhận"}
            value={orderInfo.requiresSignature ? "Có" : "Không"}
          />
          <CopyableField
            label={"Export type"}
            value={orderInfo.customsExportType}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{"4. Kiện hàng"}</CardTitle>
        </CardHeader>
        <CardContent>
          <CopyableTable
            title={"Packages"}
            columns={["Description", "Weight(Kg)", "Length(Cm)", "Width(Cm)", "Height(Cm)"]}
            rows={packages.map((p) => [
              p.description ?? "",
              p.actualWeightKg.toFixed(2),
              p.lengthCm,
              p.widthCm,
              p.heightCm,
            ])}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{"5. Khai báo Invoice"}</CardTitle>
        </CardHeader>
        <CardContent>
          <CopyableTable
            title={"Goods Details"}
            columns={["Description", "Quantity", "Unit", "Unit Price USD", "Total USD"]}
            rows={invoiceItems.map((it) => [
              it.description,
              it.quantity,
              it.unit,
              it.unitPriceUsd.toFixed(2),
              it.totalValueUsd.toFixed(2),
            ])}
          />
        </CardContent>
      </Card>

      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle>{"6. Đánh dấu đã đẩy carrier"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-3">
            {state && !state.ok && state.formError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {state.formError}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={"Carrier"}
                htmlFor="carrierCode"
                required
                error={err("carrierCode")}
              >
                <Select id="carrierCode" name="carrierCode" defaultValue="KANGO">
                  {CARRIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label={"Tracking number carrier trả"}
                htmlFor="carrierTrackingNumber"
                required
                error={err("carrierTrackingNumber")}
              >
                <Input
                  id="carrierTrackingNumber"
                  name="carrierTrackingNumber"
                  placeholder="KGE123456789VN"
                />
              </Field>
              <Field
                label={"Reference code carrier (tuỳ chọn)"}
                htmlFor="carrierReferenceCode"
              >
                <Input id="carrierReferenceCode" name="carrierReferenceCode" />
              </Field>
            </div>
            <Field label={"Ghi chú (tuỳ chọn)"} htmlFor="carrierNote">
              <Textarea
                id="carrierNote"
                name="carrierNote"
                rows={2}
                placeholder="Vd: Đẩy qua portal Kango lúc 15:30"
              />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu..." : "Đánh dấu đã đẩy"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
