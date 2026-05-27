import { z } from "zod";
import { UserRole } from "@/app/generated/prisma/enums";

const ROLE_VALUES = ["ADMIN", "STAFF", "SALE", "DRIVER"] as const;

export const announcementInputSchema = z
  .object({
    title: z.string().trim().min(1, "Vui lòng nhập tiêu đề.").max(200),
    body: z.string().trim().min(1, "Vui lòng nhập nội dung."),
    isPinned: z.boolean().default(false),
    visibleToRoles: z.array(z.enum(ROLE_VALUES)).default([]),
    expiresAt: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.expiresAt && data.expiresAt !== "") {
      const d = new Date(data.expiresAt);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ngày hết hạn không hợp lệ.",
          path: ["expiresAt"],
        });
      }
    }
  });

export type AnnouncementInput = z.infer<typeof announcementInputSchema>;

export function parseAnnouncementFormData(
  fd: FormData
): Record<string, unknown> {
  const roles: UserRole[] = [];
  for (const r of ROLE_VALUES) {
    if (fd.get(`visibleTo_${r}`) === "on" || fd.get(`visibleTo_${r}`) === "true") {
      roles.push(r);
    }
  }
  return {
    title: (fd.get("title") ?? "").toString(),
    body: (fd.get("body") ?? "").toString(),
    isPinned: fd.get("isPinned") === "on" || fd.get("isPinned") === "true",
    visibleToRoles: roles,
    expiresAt: (fd.get("expiresAt") ?? "").toString(),
  };
}
