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
import { Trash2, Plus } from "lucide-react";
import { fieldError, type ActionResult } from "@/lib/action-result";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_OPTIONS,
  PICKUP_METHOD_LABEL,
  TRANSPORT_TYPE_LABEL,
  COST_CATEGORY_LABEL,
  COST_CATEGORY_OPTIONS,
} from "@/lib/enum-labels";
import { formatCurrencyVND } from "@/lib/format";
import type {
  CostCategory,
  OrderStatus,
  PickupMethod,
  ShippingTransportType,
} from "@/app/generated/prisma/enums";
import {
  CarrierForwardSection,
  type OpsUserOption,
  type PackageRowDefault,
  type RecipientDefault,
} from "./carrier-forward-section";
import type { RecipientLite } from "@/features/recipients/queries";

export interface CustomerOption {
  id: string;
  code: string;
  name: string;
  phone: string;
  address: string;
}
export interface ServiceOption {
  id: string;
  code: string;
  name: string;
  transportType: ShippingTransportType;
  destinationCode: string;
  destinationName: string;
}
export interface CostItemOption {
  id: string;
  code: string;
  name: string;
  category: CostCategory;
  defaultAmountVnd: number | null;
  unitLabel: string | null;
}
export interface SupplyOption {
  id: string;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
}
export interface SalesUserOption {
  id: string;
  name: string;
}

export interface OrderCreateFormDefaults {
  customerId?: string;
  serviceId?: string;
  salesUserId?: string;
  pickupCode?: string;
  customerFeeVnd?: number;
  status?: OrderStatus;
  pickupMethod?: PickupMethod;
  notes?: string | null;
  assignedToUserId?: string | null;
  recipient?: RecipientDefault;
  packages?: PackageRowDefault[];
}

export interface OrderCreateFormProps {
  defaults?: OrderCreateFormDefaults;
  customers: CustomerOption[];
  services: ServiceOption[];
  costItems: CostItemOption[];
  supplies: SupplyOption[];
  salesUsers: SalesUserOption[];
  recipientOptions: RecipientLite[];
  opsUsers: OpsUserOption[];
  /** Khi người tạo là SALE — khoá ô chọn về chính họ. */
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

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

interface ExtraRow {
  key: string;
  costItemId: string;
  name: string;
  category: CostCategory;
  quantity: string;
  unitAmountVnd: string;
}

function makeEmptyExtra(): ExtraRow {
  return {
    key: uid(),
    costItemId: "",
    name: "",
    category: "OTHER",
    quantity: "1",
    unitAmountVnd: "",
  };
}

interface SupplyRow {
  key: string;
  supplyId: string;
  quantity: string;
}

function makeEmptySupply(): SupplyRow {
  return { key: uid(), supplyId: "", quantity: "" };
}

export function OrderCreateForm({
  defaults,
  customers,
  services,
  costItems,
  supplies,
  salesUsers,
  recipientOptions,
  opsUsers,
  lockedSalesUser,
  action,
  submitLabel,
}: OrderCreateFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const [extraRows, setExtraRows] = React.useState<ExtraRow[]>(() => [
    makeEmptyExtra(),
  ]);
  const [supplyRows, setSupplyRows] = React.useState<SupplyRow[]>(() => []);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>(
    defaults?.customerId ?? ""
  );

  const senderSummary = React.useMemo(() => {
    if (!selectedCustomerId) return null;
    const c = customers.find((cc) => cc.id === selectedCustomerId);
    if (!c) return null;
    return { name: c.name, phone: c.phone, address: c.address };
  }, [selectedCustomerId, customers]);

  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  const extraAmounts = React.useMemo(
    () =>
      extraRows.map((r) => {
        const q = Number(r.quantity);
        const u = Number(r.unitAmountVnd);
        if (!(q > 0) || !(u >= 0)) return 0;
        return Math.round(q * u);
      }),
    [extraRows]
  );
  const extraTotal = extraAmounts.reduce((s, a) => s + a, 0);

  const updateExtra = (key: string, patch: Partial<ExtraRow>) => {
    setExtraRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );
  };
  const addExtra = () => setExtraRows((prev) => [...prev, makeEmptyExtra()]);
  const removeExtra = (key: string) =>
    setExtraRows((prev) => prev.filter((r) => r.key !== key));

  const pickCostItem = (key: string, costItemId: string) => {
    const item = costItems.find((c) => c.id === costItemId);
    if (!item) {
      updateExtra(key, { costItemId: "" });
      return;
    }
    updateExtra(key, {
      costItemId,
      name: item.name,
      category: item.category,
      unitAmountVnd:
        item.defaultAmountVnd != null ? String(item.defaultAmountVnd) : "",
    });
  };

  const updateSupply = (key: string, patch: Partial<SupplyRow>) => {
    setSupplyRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );
  };
  const addSupply = () => setSupplyRows((prev) => [...prev, makeEmptySupply()]);
  const removeSupply = (key: string) =>
    setSupplyRows((prev) => prev.filter((r) => r.key !== key));

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
          <Field label={"Khách hàng"} htmlFor="customerId" required error={err("customerId")}>
            <Select
              id="customerId"
              name="customerId"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="">--</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code + " - " + c.name + " (" + c.phone + ")"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={"Dịch vụ"} htmlFor="serviceId" required error={err("serviceId")}>
            <Select id="serviceId" name="serviceId" defaultValue={defaults?.serviceId ?? ""}>
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
                : "Nhân viên kinh doanh phụ trách đơn (dùng cho thống kê doanh thu)."
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

      <FormSection title={"Chi phí phát sinh"} description={"Phí thùng carton, phụ thu hàng khó, và các chi phí khác. Có thể bỏ trống."}>
        <div className="space-y-4">
          {extraRows.map((row, i) => (
            <div key={row.key} className="rounded-md border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {"Chi phí" + " #" + (i + 1)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeExtra(row.key)}
                  aria-label={"Xóa"}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  <span className="ml-1">{"Xóa"}</span>
                </Button>
              </div>
              <input type="hidden" name={"extra[" + i + "][costItemId]"} value={row.costItemId} />
              <Field label={"Chọn từ danh mục"} htmlFor={"ex-item-" + row.key}>
                <Select
                  id={"ex-item-" + row.key}
                  value={row.costItemId}
                  onChange={(e) => pickCostItem(row.key, e.target.value)}
                >
                  <option value="">{"— Tự nhập —"}</option>
                  {costItems.map((ci) => (
                    <option key={ci.id} value={ci.id}>
                      {ci.code + " - " + ci.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-3 md:grid-cols-4">
                <Field label={"Tên khoản chi phí"} htmlFor={"ex-name-" + row.key} required className="md:col-span-2">
                  <Input
                    id={"ex-name-" + row.key}
                    name={"extra[" + i + "][name]"}
                    value={row.name}
                    onChange={(e) => updateExtra(row.key, { name: e.target.value })}
                    autoComplete="off"
                  />
                </Field>
                <Field label={"Nhóm"} htmlFor={"ex-cat-" + row.key}>
                  <Select
                    id={"ex-cat-" + row.key}
                    name={"extra[" + i + "][category]"}
                    value={row.category}
                    onChange={(e) => updateExtra(row.key, { category: e.target.value as CostCategory })}
                  >
                    {COST_CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {COST_CATEGORY_LABEL[cat]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={"Số lượng"} htmlFor={"ex-qty-" + row.key} required>
                  <Input
                    id={"ex-qty-" + row.key}
                    name={"extra[" + i + "][quantity]"}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={row.quantity}
                    onChange={(e) => updateExtra(row.key, { quantity: e.target.value })}
                    inputMode="decimal"
                  />
                </Field>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label={"Đơn giá (VND)"} htmlFor={"ex-unit-" + row.key} required>
                  <Input
                    id={"ex-unit-" + row.key}
                    name={"extra[" + i + "][unitAmountVnd]"}
                    type="number"
                    step="1000"
                    min="0"
                    value={row.unitAmountVnd}
                    onChange={(e) => updateExtra(row.key, { unitAmountVnd: e.target.value })}
                    inputMode="numeric"
                  />
                </Field>
                <div className="flex items-end justify-between rounded bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{"Thành tiền"}</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatCurrencyVND(extraAmounts[i])}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addExtra}>
            <Plus className="h-4 w-4" aria-hidden />
            <span className="ml-1">{"Thêm chi phí"}</span>
          </Button>

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
            <span className="font-medium text-muted-foreground">{"Tổng chi phí phát sinh"}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatCurrencyVND(extraTotal)}
            </span>
          </div>
        </div>
      </FormSection>

      <FormSection title={"Vật tư sử dụng"} description={"Vật tư đóng gói tiêu hao cho đơn này. Khi lưu đơn, kho tự trừ tồn. Có thể bỏ trống."}>
        <div className="space-y-3">
          {supplyRows.map((row, i) => (
            <div key={row.key} className="flex items-end gap-2">
              <Field label={"Vật tư"} htmlFor={"sup-" + row.key} className="flex-1">
                <Select
                  id={"sup-" + row.key}
                  name={"supply[" + i + "][supplyId]"}
                  value={row.supplyId}
                  onChange={(e) => updateSupply(row.key, { supplyId: e.target.value })}
                >
                  <option value="">{"— Chọn vật tư —"}</option>
                  {supplies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code + " - " + s.name + " (" + "còn" + " " + s.currentStock + " " + s.unit + ")"}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={"Số lượng"} htmlFor={"sup-q-" + row.key} className="w-40">
                <Input
                  id={"sup-q-" + row.key}
                  name={"supply[" + i + "][quantity]"}
                  type="number"
                  step="1"
                  min="1"
                  value={row.quantity}
                  onChange={(e) => updateSupply(row.key, { quantity: e.target.value })}
                  inputMode="numeric"
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-0.5"
                onClick={() => removeSupply(row.key)}
                aria-label={"Xóa"}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addSupply}>
            <Plus className="h-4 w-4" aria-hidden />
            <span className="ml-1">{"Thêm vật tư"}</span>
          </Button>
        </div>
      </FormSection>

      <FormSection title={"Cước phí thu khách"} description={"Nhập tổng cước thu khách cho đơn này."}>
        <Field label={"Cước thu khách (VND)"} htmlFor="customerFeeVnd" required error={err("customerFeeVnd")}>
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

      <FormSection title={"Trạng thái & ghi chú"} description={"Trạng thái xử lý và ghi chú đơn hàng."}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={"Trạng thái"} htmlFor="status" required error={err("status")}>
            <Select id="status" name="status" defaultValue={defaults?.status ?? "DRAFT"}>
              {ORDER_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={"Phương thức lấy hàng"} htmlFor="pickupMethod" required error={err("pickupMethod")}>
            <Select id="pickupMethod" name="pickupMethod" defaultValue={defaults?.pickupMethod ?? "NONE"}>
              {PICKUP_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PICKUP_METHOD_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={"Ghi chú"} htmlFor="notes" className="md:col-span-2" error={err("notes")}>
            <Textarea id="notes" name="notes" defaultValue={defaults?.notes ?? ""} rows={3} />
          </Field>
        </div>
      </FormSection>

      <CarrierForwardSection
        sender={senderSummary}
        recipientOptions={recipientOptions}
        opsUsers={opsUsers}
        defaults={{
          recipient: defaults?.recipient,
          assignedToUserId: defaults?.assignedToUserId,
          packages: defaults?.packages,
          pickupCode: defaults?.pickupCode,
        }}
        errors={{
          "recipient.contactName": err("recipient.contactName"),
          "recipient.phone": err("recipient.phone"),
          "recipient.address": err("recipient.address"),
          pickupCode: err("pickupCode"),
          packages: err("packages"),
        }}
        showPackages={true}
      />

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
