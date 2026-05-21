import { z } from "zod";

/** Role có thể gán tay trong module Tài khoản (DRIVER quản lý ở module Tài xế). */
export const ASSIGNABLE_ROLES = ["ADMIN", "STAFF", "SALE"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const nameField = z.string().trim().min(1, "Vui lòng nhập họ tên.");
const emailField = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập email.")
  .email("Email không hợp lệ.");
const passwordField = z
  .string()
  .min(6, "Mật khẩu tối thiểu 6 ký tự.")
  .max(72, "Mật khẩu tối đa 72 ký tự.");

export const userCreateSchema = z.object({
  name: nameField,
  email: emailField,
  role: z.enum(ASSIGNABLE_ROLES, { message: "Vui lòng chọn vai trò." }),
  password: passwordField,
  isActive: z.boolean().default(true),
});

export const userUpdateSchema = z.object({
  name: nameField,
  email: emailField,
  role: z.enum(ASSIGNABLE_ROLES, { message: "Vui lòng chọn vai trò." }),
  isActive: z.boolean().default(true),
});

export const passwordSchema = z
  .object({
    password: passwordField,
    confirm: z.string().min(1, "Vui lòng nhập lại mật khẩu."),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Mật khẩu nhập lại không khớp.",
    path: ["confirm"],
  });

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export function parseUserFormData(fd: FormData): Record<string, unknown> {
  return {
    name: (fd.get("name") ?? "").toString(),
    email: (fd.get("email") ?? "").toString(),
    role: (fd.get("role") ?? "STAFF").toString(),
    password: (fd.get("password") ?? "").toString(),
    isActive: fd.get("isActive") === "on" || fd.get("isActive") === "true",
  };
}

export function parsePasswordFormData(fd: FormData): Record<string, unknown> {
  return {
    password: (fd.get("password") ?? "").toString(),
    confirm: (fd.get("confirm") ?? "").toString(),
  };
}
