"use client";

import * as React from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  applyMarkupBatch,
  defaultMarkupRanges,
  validateMarkupRanges,
  type MarkupRange,
  type MarkupInput,
  type RoundingMode,
} from "@/lib/cost-rates/markup";

const fmtVnd = (n: number): string =>
  n > 0 ? n.toLocaleString("vi-VN") : "—";

export interface MarkupModalProps {
  open: boolean;
  onClose: () => void;
  /** Danh sách giá carrier (cost) hiện tại trong form, kèm cân tương ứng. */
  items: MarkupInput[];
  /** Áp dụng — gọi lại với danh sách sell prices (theo thứ tự items). */
  onApply: (sellPrices: number[]) => void;
  /** localStorage key để cache markup ranges per service. Optional. */
  cacheKey?: string;
}

const ROUNDING_OPTIONS: { value: RoundingMode; label: string }[] = [
  { value: "1K", label: "1.000 VNĐ" },
  { value: "5K", label: "5.000 VNĐ" },
  { value: "10K", label: "10.000 VNĐ" },
  { value: "NONE", label: "Không làm tròn" },
];

interface CachedConfig {
  ranges: MarkupRange[];
  rounding: RoundingMode;
}

function loadCache(key: string | undefined): CachedConfig | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const s = window.localStorage.getItem(key);
    if (!s) return null;
    return JSON.parse(s) as CachedConfig;
  } catch {
    return null;
  }
}

function saveCache(key: string | undefined, cfg: CachedConfig): void {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(cfg));
  } catch {
    // ignore quota
  }
}

export function MarkupModal({
  open,
  onClose,
  items,
  onApply,
  cacheKey,
}: MarkupModalProps) {
  const cached = React.useMemo(() => loadCache(cacheKey), [cacheKey]);
  const [ranges, setRanges] = React.useState<MarkupRange[]>(
    () => cached?.ranges ?? defaultMarkupRanges()
  );
  const [rounding, setRounding] = React.useState<RoundingMode>(
    () => cached?.rounding ?? "1K"
  );

  const validation = React.useMemo(
    () => validateMarkupRanges(ranges),
    [ranges]
  );
  const preview = React.useMemo(() => {
    if (!validation.ok) return [];
    return applyMarkupBatch(items, ranges, rounding);
  }, [items, ranges, rounding, validation.ok]);

  const updateRange = (idx: number, patch: Partial<MarkupRange>) =>
    setRanges((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  const addRange = () =>
    setRanges((prev) => {
      const last = prev[prev.length - 1];
      const newMin = last ? last.maxWeightKg : 0;
      return [
        ...prev,
        {
          minWeightKg: newMin,
          maxWeightKg: Math.max(newMin + 1, 9999),
          markupPercent: last?.markupPercent ?? 20,
        },
      ];
    });
  const removeRange = (idx: number) =>
    setRanges((prev) => prev.filter((_, i) => i !== idx));

  const handleApply = () => {
    if (!validation.ok) return;
    saveCache(cacheKey, { ranges, rounding });
    onApply(preview.map((p) => p.sellVnd));
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
        role="dialog"
        aria-modal
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-base font-semibold">{"Markup theo dải cân"}</h2>
            <p className="text-xs text-muted-foreground">
              {"Cộng % markup vào giá carrier (cost) → ra giá bán cho khách."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Ranges editor */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{"Dải cân + markup %"}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRanges(defaultMarkupRanges())}
                  title="Khôi phục 9 dải mặc định EZWAY"
                >
                  {"Reset mặc định"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRange}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {"Thêm dải"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {ranges.map((r, i) => (
                <div
                  key={i}
                  className="grid items-center gap-2 rounded-md border border-border bg-muted/20 p-2 sm:grid-cols-[40px_1fr_auto_1fr_auto_120px_40px]"
                >
                  <span className="text-xs font-mono text-muted-foreground">{`#${i + 1}`}</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={r.minWeightKg}
                    onChange={(e) =>
                      updateRange(i, { minWeightKg: Number(e.target.value) })
                    }
                    aria-label="Từ (kg)"
                  />
                  <span className="text-xs text-muted-foreground">{"→"}</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={r.maxWeightKg}
                    onChange={(e) =>
                      updateRange(i, { maxWeightKg: Number(e.target.value) })
                    }
                    aria-label="Đến (kg)"
                  />
                  <span className="text-xs text-muted-foreground">{"kg, +"}</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={r.markupPercent}
                      onChange={(e) =>
                        updateRange(i, {
                          markupPercent: Number(e.target.value),
                        })
                      }
                      aria-label="Markup %"
                    />
                    <span className="text-xs font-medium">%</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={ranges.length === 1}
                    onClick={() => removeRange(i)}
                    aria-label="Xoá dải"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            {!validation.ok ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                {validation.errors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            ) : null}
          </section>

          {/* Rounding */}
          <section className="mt-4 flex items-center gap-3">
            <label className="text-sm font-medium">{"Làm tròn:"}</label>
            <Select
              value={rounding}
              onChange={(e) => setRounding(e.target.value as RoundingMode)}
              className="w-44"
            >
              {ROUNDING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </section>

          {/* Preview */}
          <section className="mt-4 space-y-2">
            <p className="text-sm font-medium">
              {`Xem trước (${preview.length} dòng)`}
            </p>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {"Form chưa có giá carrier. Paste hoặc nhập trước khi mở markup."}
              </p>
            ) : !validation.ok ? (
              <p className="text-xs text-muted-foreground">
                {"Sửa lỗi dải markup ở trên để xem preview."}
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Cân</th>
                      <th className="px-2 py-1.5 text-right font-medium">Carrier</th>
                      <th className="px-2 py-1.5 text-right font-medium">→ Sell</th>
                      <th className="px-2 py-1.5 text-right font-medium">+%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, i) => (
                      <tr
                        key={i}
                        className="border-t border-border hover:bg-muted/30"
                      >
                        <td className="px-2 py-1 font-mono">{p.weightKg} kg</td>
                        <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                          {fmtVnd(p.costVnd)}
                        </td>
                        <td className="px-2 py-1 text-right font-semibold tabular-nums text-primary">
                          {fmtVnd(p.sellVnd)}
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                          +{p.markupPercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {"Bỏ"}
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!validation.ok || preview.length === 0}
          >
            {`Áp dụng vào form (${preview.length} giá)`}
          </Button>
        </footer>
      </div>
    </div>
  );
}
