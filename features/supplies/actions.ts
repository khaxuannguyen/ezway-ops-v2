"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActorUserId } from "@/lib/current-user";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import {
  supplyInputSchema,
  stockMovementSchema,
  parseSupplyFormData,
  parseStockMovementFormData,
} from "./schemas";

function normOpt(v: string | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (err as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

function fieldErrorsFrom(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>
): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of issues) {
    const k = issue.path.map((p) => String(p)).join(".") || "_";
    fieldErrors[k] = fieldErrors[k] ?? [];
    fieldErrors[k].push(issue.message);
  }
  return fieldErrors;
}

export async function createSupply(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = supplyInputSchema.safeParse(parseSupplyFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const data = parsed.data;

  try {
    const created = await prisma.supply.create({
      data: {
        code: data.code,
        name: data.name,
        category: data.category,
        unit: data.unit,
        minStock: data.minStock,
        notes: normOpt(data.notes),
        isActive: data.isActive,
      },
      select: { id: true },
    });

    revalidatePath("/admin/supplies");
    redirect(`/admin/supplies/${created.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return { ok: false, fieldErrors: { code: ["Mã vật tư đã tồn tại."] } };
    }
    return { ok: false, formError: "Không thể lưu vật tư. Vui lòng thử lại." };
  }
}

export async function updateSupply(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = supplyInputSchema.safeParse(parseSupplyFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const data = parsed.data;

  try {
    await prisma.supply.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        category: data.category,
        unit: data.unit,
        minStock: data.minStock,
        notes: normOpt(data.notes),
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/supplies");
    revalidatePath(`/admin/supplies/${id}`);
    redirect(`/admin/supplies/${id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (isPrismaUniqueViolation(err)) {
      return { ok: false, fieldErrors: { code: ["Mã vật tư đã tồn tại."] } };
    }
    return { ok: false, formError: "Không thể lưu vật tư. Vui lòng thử lại." };
  }
}

export async function recordStockMovement(
  supplyId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = stockMovementSchema.safeParse(
    parseStockMovementFormData(formData)
  );
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const { type, quantity, note } = parsed.data;

  if ((type === "IN" || type === "OUT") && quantity <= 0) {
    return { ok: false, fieldErrors: { quantity: ["Số lượng phải lớn hơn 0."] } };
  }

  try {
    const createdById = await getActorUserId();

    await prisma.$transaction(async (tx) => {
      const supply = await tx.supply.findUnique({
        where: { id: supplyId },
        select: { id: true, currentStock: true },
      });
      if (!supply) {
        throw new Error("SUPPLY_NOT_FOUND");
      }

      let delta: number;
      let stockAfter: number;
      if (type === "IN") {
        delta = quantity;
        stockAfter = supply.currentStock + quantity;
      } else if (type === "OUT") {
        delta = -quantity;
        stockAfter = supply.currentStock - quantity;
        if (stockAfter < 0) {
          throw new Error("INSUFFICIENT_STOCK");
        }
      } else {
        // ADJUST: quantity is the actual counted stock.
        stockAfter = quantity;
        delta = quantity - supply.currentStock;
      }

      await tx.stockMovement.create({
        data: {
          supplyId: supply.id,
          type,
          quantityDelta: delta,
          stockAfter,
          note: normOpt(note),
          createdById,
        },
      });
      await tx.supply.update({
        where: { id: supply.id },
        data: { currentStock: stockAfter },
      });
    });

    revalidatePath("/admin/supplies");
    revalidatePath(`/admin/supplies/${supplyId}`);
    return { ok: true, data: { id: supplyId } };
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_STOCK") {
      return { ok: false, formError: "Tồn kho không đủ để xuất." };
    }
    if (err instanceof Error && err.message === "SUPPLY_NOT_FOUND") {
      return { ok: false, formError: "Không tìm thấy vật tư." };
    }
    return { ok: false, formError: "Không thể ghi nhận giao dịch kho. Vui lòng thử lại." };
  }
}
