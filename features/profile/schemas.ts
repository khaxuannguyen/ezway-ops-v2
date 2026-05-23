import { z } from "zod";

const optText = (max: number) =>
  z.string().trim().max(max, `Tối đa ${max} ký tự.`);

const optDate = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Ngày không hợp lệ.");

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập họ tên.").max(120),
  phone: optText(20),
  address: optText(255),
  position: optText(100),
  dateOfBirth: optDate,
  joinedAt: optDate,
  emergencyContactName: optText(120),
  emergencyContactPhone: optText(20),
  nationalId: optText(30),
  notes: optText(1000),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại."),
    newPassword: z
      .string()
      .min(6, "Mật khẩu mới tối thiểu 6 ký tự.")
      .max(72, "Mật khẩu tối đa 72 ký tự."),
    confirm: z.string().min(1, "Nhập lại mật khẩu mới."),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: "Mật khẩu nhập lại không khớp.",
    path: ["confirm"],
  });

export function parseProfileFormData(fd: FormData): Record<string, unknown> {
  return {
    name: (fd.get("name") ?? "").toString(),
    phone: (fd.get("phone") ?? "").toString(),
    address: (fd.get("address") ?? "").toString(),
    position: (fd.get("position") ?? "").toString(),
    dateOfBirth: (fd.get("dateOfBirth") ?? "").toString(),
    joinedAt: (fd.get("joinedAt") ?? "").toString(),
    emergencyContactName: (fd.get("emergencyContactName") ?? "").toString(),
    emergencyContactPhone: (fd.get("emergencyContactPhone") ?? "").toString(),
    nationalId: (fd.get("nationalId") ?? "").toString(),
    notes: (fd.get("notes") ?? "").toString(),
  };
}

export function parsePasswordFormData(fd: FormData): Record<string, unknown> {
  return {
    currentPassword: (fd.get("currentPassword") ?? "").toString(),
    newPassword: (fd.get("newPassword") ?? "").toString(),
    confirm: (fd.get("confirm") ?? "").toString(),
  };
}
