"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Upload } from "lucide-react";
import { Field } from "@/components/shared/field";
import { FormSection } from "@/components/shared/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { fieldError, type ActionResult } from "@/lib/action-result";
import { parsePriceColumn } from "@/features/cost-rates/excel-paste";
import {
  STANDARD_FIXED_WEIGHTS,
  STANDARD_PERKG_RANGES,
} from "@/features/cost-rates/constants";

export interface ServiceOption {
  id: string;
  code: string;
  name: string;
}

export interface CostRateBulkDefaults {
  validFrom?: string;
  validTo?: string;
  // Prices aligned to STANDARD_FIXED_WEIGHTS / STANDARD_PERKG_RANGES order.
  fixedPrices?: string[];
  perKgPrices?: string[];
}

export interface CostRateBulkFormProps {
  services: ServiceOption[];
  defaultServiceId?: string;
  lockService?: boolean;
  defaults?: CostRateBulkDefaults;
  action: (
    prev: ActionResult<{ serviceId: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ serviceId: string }>>;
  submitLabel: string;
}

function todayInput(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}

const FIXED_COUNT = STANDARD_FIXED_WEIGHTS.length;
const PERKG_COUNT = STANDARD_PERKG_RANGES.length;

function blankArray(n: number): string[] {
  return Array.from({ length: n }, () => "");
}

export function CostRateBulkForm({
  services,
  defaultServiceId,
  lockService,
  defaults,
  action,
  submitLabel,
}: CostRateBulkFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ serviceId: string }> | null,
    FormData
  >(action, null);

  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  const [fixedPrices, setFixedPrices] = React.useState<string[]>(() => {
    const base = blankArray(FIXED_COUNT);
    (defaults?.fixedPrices ?? []).forEach((v, i) => {
      if (i < FIXED_COUNT) base[i] = v;
    });
    return base;
  });
  const [perKgPrices, setPerKgPrices] = React.useState<string[]>(() => {
    const base = blankArray(PERKG_COUNT);
    (defaults?.perKgPrices ?? []).forEach((v, i) => {
      if (i < PERKG_COUNT) base[i] = v;
    });
    return base;
  });

  const [pasteText, setPasteText] = React.useState("");
  const [pasteMsg, setPasteMsg] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const applyPaste = (text: string) => {
    const prices = parsePriceColumn(text);
    if (prices.length === 0) {
      setPasteMsg("Không đọc được giá nào. Kiểm tra lại dữ liệu.");
      return;
    }
    const nextFixed = blankArray(FIXED_COUNT);
    const nextPerKg = blankArray(PERKG_COUNT);
    prices.forEach((p, i) => {
      if (i < FIXED_COUNT) nextFixed[i] = String(p);
      else if (i < FIXED_COUNT + PERKG_COUNT) nextPerKg[i - FIXED_COUNT] = String(p);
    });
    setFixedPrices(nextFixed);
    setPerKgPrices(nextPerKg);
    setPasteMsg(
      "Đã điền" + " " + prices.length + " " + "giá"
    );
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setPasteText(text);
      applyPaste(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const setFixedAt = (i: number, value: string) =>
    setFixedPrices((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  const setPerKgAt = (i: number, value: string) =>
    setPerKgPrices((prev) => prev.map((v, idx) => (idx === i ? value : v)));

  const fixedFilled = fixedPrices.filter((v) => v.trim() !== "").length;
  const perKgFilled = perKgPrices.filter((v) => v.trim() !== "").length;

  return (
    <form action={formAction}>
      {state && !state.ok && state.formError ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}
      {state && !state.ok && state.fieldErrors?._ ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.fieldErrors._[0]}
        </div>
      ) : null}

      <FormSection title={"Dịch vụ & hiệu lực"} description={"Bảng giá áp cho dịch vụ nào và từ ngày nào."}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={"Dịch vụ"} htmlFor="serviceId" required error={err("serviceId")}>
            <Select
              id="serviceId"
              name={lockService && defaultServiceId ? undefined : "serviceId"}
              defaultValue={defaultServiceId ?? ""}
              disabled={lockService}
            >
              <option value="">--</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code + " - " + s.name}
                </option>
              ))}
            </Select>
            {lockService && defaultServiceId ? (
              <input type="hidden" name="serviceId" value={defaultServiceId} />
            ) : null}
          </Field>
          <Field label={"Hiệu lực từ"} htmlFor="validFrom" required error={err("validFrom")}>
            <Input id="validFrom" name="validFrom" type="date" defaultValue={defaults?.validFrom ?? todayInput()} />
          </Field>
          <Field label={"Hiệu lực đến (tuỳ chọn)"} htmlFor="validTo" error={err("validTo")}>
            <Input id="validTo" name="validTo" type="date" defaultValue={defaults?.validTo ?? ""} />
          </Field>
        </div>
      </FormSection>

      <FormSection title={"Nhập cột giá"} description={"Mốc cân đã cố định sẵn. Chỉ cần dán cột giá (mỗi dòng 1 giá) — hệ thống tự điền vào bảng."}>
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={handleFile}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden />
              <span className="ml-1">{"Chọn file CSV"}</span>
            </Button>
            {fileName ? (
              <span className="text-xs text-muted-foreground">{"Đã chọn" + ": " + fileName}</span>
            ) : null}
          </div>
          <Textarea
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              applyPaste(e.target.value);
            }}
            rows={5}
            placeholder={"652982\n817321\n982204\n..."}
            className="font-mono text-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPasteText("");
                setPasteMsg(null);
                setFileName(null);
              }}
            >
              <ClipboardPaste className="h-4 w-4" aria-hidden />
              <span className="ml-1">{"Xoá ô dán"}</span>
            </Button>
            {pasteMsg ? <span className="text-xs text-muted-foreground">{pasteMsg}</span> : null}
          </div>
          <div className="space-y-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{"Quy chuẩn cột giá"}</p>
            <p>{"Dán đúng 1 cột: chỉ số tiền, mỗi dòng 1 giá."}</p>
            <p>{"Thứ tự: 41 mốc cố định (0,5 đến 20,5kg) rồi 5 bậc theo kg."}</p>
            <p>{"Có thể có dấu phân cách nghìn. Dòng tiêu đề tự bỏ qua."}</p>
          </div>
        </div>
      </FormSection>

      <FormSection title={"Mốc cố định (giá trọn gói)"} description={"Mốc cân đã cố định. Chỉ điền đơn giá cho từng mốc."}>
        <div className="space-y-2">
          {STANDARD_FIXED_WEIGHTS.map((w, i) => (
            <div key={"f" + i} className="flex items-center gap-3">
              <div className="w-10 text-xs text-muted-foreground">{"#" + (i + 1)}</div>
              <div className="w-32 shrink-0 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm tabular-nums">
                {w + " kg"}
              </div>
              <input type="hidden" name={"fixed[" + i + "][weightKg]"} value={String(w)} />
              <Input
                name={"fixed[" + i + "][amountVnd]"}
                type="number"
                step="1"
                min="0"
                value={fixedPrices[i]}
                onChange={(e) => setFixedAt(i, e.target.value)}
                inputMode="numeric"
                placeholder={"Đơn giá (VND)"}
                className="flex-1"
              />
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title={"Bậc theo kg"} description={"Khoảng cân đã cố định. Chỉ điền đơn giá mỗi kg."}>
        <div className="space-y-2">
          {STANDARD_PERKG_RANGES.map((rg, i) => (
            <div key={"p" + i} className="flex items-center gap-3">
              <div className="w-10 text-xs text-muted-foreground">{"#" + (i + 1)}</div>
              <div className="w-32 shrink-0 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm tabular-nums">
                {rg.min + " - " + rg.max + " kg"}
              </div>
              <input type="hidden" name={"perkg[" + i + "][minWeightKg]"} value={String(rg.min)} />
              <input type="hidden" name={"perkg[" + i + "][maxWeightKg]"} value={String(rg.max)} />
              <Input
                name={"perkg[" + i + "][amountVnd]"}
                type="number"
                step="1"
                min="0"
                value={perKgPrices[i]}
                onChange={(e) => setPerKgAt(i, e.target.value)}
                inputMode="numeric"
                placeholder={"Đơn giá (VND)"}
                className="flex-1"
              />
            </div>
          ))}
        </div>
      </FormSection>

      <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {"Đã nhập" + ": " + fixedFilled + " " + "mốc cố định" + ", " + perKgFilled + " " + "bậc theo kg"}
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
            {"Huỷ"}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Đang lưu..." : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
