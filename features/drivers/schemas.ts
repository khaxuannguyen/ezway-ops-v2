import { z } from "zod";
import { VehicleType } from "@/app/generated/prisma/enums";

const phoneRegex = /^[0-9+\-\s()]{8,20}$/;

export const driverInputSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên tài xế."),
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email.")
    .email("Email không hợp lệ."),
  phone: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số điện thoại hợp lệ.")
    .regex(phoneRegex, "Vui lòng nhập số điện thoại hợp lệ."),
  vehicleType: z.nativeEnum(VehicleType),
  vehiclePlate: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type DriverInput = z.infer<typeof driverInputSchema>;

export function parseDriverFormData(fd: FormData): Record<string, unknown> {
  return {
    name: (fd.get("name") ?? "").toString(),
    email: (fd.get("email") ?? "").toString(),
    phone: (fd.get("phone") ?? "").toString(),
    vehicleType: (fd.get("vehicleType") ?? "MOTORBIKE").toString(),
    vehiclePlate: (fd.get("vehiclePlate") ?? "").toString(),
    isActive: fd.get("isActive") === "on" || fd.get("isActive") === "true",
  };
}
