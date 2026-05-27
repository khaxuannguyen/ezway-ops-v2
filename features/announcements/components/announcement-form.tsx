"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/shared/field";
import { FormSection } from "@/components/shared/form-section";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { fieldError, type ActionResult } from "@/lib/action-result";
import type { UserRole } from "@/app/generated/prisma/enums";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Quản trị viên" },
  { value: "STAFF", label: "Nhân viên (STAFF)" },
  { value: "SALE", label: "Nhân viên Sale" },
  { value: "DRIVER", label: "Tài xế" },
];

export interface AnnouncementFormDefaults {
  title?: string;
  body?: string;
  isPinned?: boolean;
  visibleToRoles?: UserRole[];
  expiresAt?: string | null; // ISO date string
}

export interface AnnouncementFormProps {
  defaults?: AnnouncementFormDefaults;
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData
  ) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
}

function toDateInput(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function AnnouncementForm({
  defaults,
  action,
  submitLabel,
}: AnnouncementFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);
  const err = (n: string) => (state ? fieldError(state, n) : undefined);

  const defaultRoles = new Set(defaults?.visibleToRoles ?? []);
  // Trống = mọi role thấy. UI thể hiện = check all = ngầm "trống".
  // Đơn giản: nếu defaults trống → check all.
  const initialRoles =
    defaultRoles.size === 0
      ? new Set<UserRole>(["ADMIN", "STAFF", "SALE", "DRIVER"])
      : defaultRoles;
  const [selectedRoles, setSelectedRoles] = React.useState<Set<UserRole>>(
    initialRoles
  );

  const toggleRole = (r: UserRole) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  };

  return (
    <form action={formAction}>
      {state && !state.ok && state.formError ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </div>
      ) : null}

      <FormSection title={"Nội dung"} description={"Tiêu đề + nội dung văn bản."}>
        <Field
          label={"Tiêu đề"}
          htmlFor="title"
          required
          error={err("title")}
          description={"Có thể dùng emoji ở đầu (📢, 🚨...)"}
        >
          <Input
            id="title"
            name="title"
            defaultValue={defaults?.title ?? ""}
            placeholder="📢 THÔNG BÁO LỊCH CUT-OFF..."
          />
        </Field>
        <Field
          label={"Nội dung"}
          htmlFor="body"
          required
          error={err("body")}
          description={
            "Văn bản nhiều dòng, giữ định dạng xuống dòng. URL sẽ tự động thành link khi xem."
          }
        >
          <Textarea
            id="body"
            name="body"
            rows={10}
            defaultValue={defaults?.body ?? ""}
            placeholder={"Nội dung chi tiết..."}
          />
        </Field>
      </FormSection>

      <FormSection
        title={"Cấu hình"}
        description={"Ai thấy + ghim đầu list + ngày hết hạn."}
      >
        <Field label={"Hiển thị cho"} htmlFor="visibleToRoles">
          <div className="flex flex-wrap gap-3">
            {ROLE_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`visibleTo_${o.value}`}
                  checked={selectedRoles.has(o.value)}
                  onChange={() => toggleRole(o.value)}
                  className="h-4 w-4"
                />
                {o.label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {"Chọn tất cả = mọi role thấy."}
          </p>
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isPinned"
            defaultChecked={defaults?.isPinned ?? false}
            className="h-4 w-4"
          />
          {"Ghim đầu danh sách (⭐)"}
        </label>

        <Field
          label={"Ngày hết hạn (tuỳ chọn)"}
          htmlFor="expiresAt"
          description={"Sau ngày này thông báo sẽ tự ẩn khỏi list."}
          error={err("expiresAt")}
        >
          <Input
            id="expiresAt"
            name="expiresAt"
            type="date"
            defaultValue={toDateInput(defaults?.expiresAt)}
          />
        </Field>
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
