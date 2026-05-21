"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildOrderCode } from "@/lib/codegen";
import { getActorUserId } from "@/lib/current-user";
import {
  calculateOrderPackageTotals,
  computePackageWeights,
  priceOrder,
  type RateTier,
} from "@/lib/domain";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import type { CostPricingType } from "@/app/generated/prisma/enums";
import {
  orderCreateInputSchema,
  orderInputSchema,
  parseOrderCreateFormData,
  parseOrderFormData,
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

async function loadTiers(serviceId: string): Promise<RateTier[]> {
  const rates = await prisma.serviceCostRate.findMany({
    where: { serviceId },
    orderBy: { minWeightKg: "asc" },
  });
  return rates.map((r) => ({
    id: r.id,
    minWeightKg: Number(r.minWeightKg),
    maxWeightKg: Number(r.maxWeightKg),
    rateType: r.rateType as RateTier["rateType"],
    amountVnd: r.amountVnd,
  }));
}

async function nextOrderCode(date: Date): Promise<string> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const count = await prisma.order.count({
    where: { createdAt: { gte: start, lt: end } },
  });
  return buildOrderCode(count + 1, date);
}

export async function createOrder(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = orderCreateInputSchema.safeParse(
    parseOrderCreateFormData(formData)
  );
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".") || "_";
      fieldErrors[k] = fieldErrors[k] ?? [];
      fieldErrors[k].push(issue.message);
    }
    return { ok: false, fieldErrors };
  }
  const data = parsed.data;

  try {
    const [service, customer] = await Promise.all([
      prisma.shippingService.findUnique({
        where: { id: data.serviceId },
        select: { id: true, volumetricDivisor: true },
      }),
      prisma.customer.findUnique({
        where: { id: data.customerId },
        select: { id: true },
      }),
    ]);
    if (!service) {
      return { ok: false, fieldErrors: { serviceId: ["Vui lòng chọn dịch vụ."] } };
    }
    if (!customer) {
      return { ok: false, fieldErrors: { customerId: ["Vui lòng chọn khách hàng."] } };
    }

    const packageWeights = data.packages.map((p) =>
      computePackageWeights({
        actualWeightKg: p.actualWeightKg,
        lengthCm: p.lengthCm,
        widthCm: p.widthCm,
        heightCm: p.heightCm,
      })
    );
    const totals = calculateOrderPackageTotals(packageWeights);

    const tiers = await loadTiers(service.id);
    let tier, baseCostVnd;
    try {
      ({ tier, baseCostVnd } = priceOrder(totals.totalChargeableWeight, tiers));
    } catch {
      return {
        ok: false,
        fieldErrors: {
          packages: ["Không có bậc giá phù hợp cho tổng cân tính cước của các kiện."],
        },
      };
    }

    // Resolve extra costs — link to a CostItem when one is picked, else custom.
    const linkedIds = [
      ...new Set(
        data.extraCosts
          .map((e) => (e.costItemId ?? "").trim())
          .filter((v) => v !== "")
      ),
    ];
    const pricingByItem = new Map<string, CostPricingType>();
    if (linkedIds.length > 0) {
      const items = await prisma.costItem.findMany({
        where: { id: { in: linkedIds } },
        select: { id: true, pricingType: true },
      });
      for (const it of items) pricingByItem.set(it.id, it.pricingType);
    }
    const extraCostRecords = data.extraCosts.map((e) => {
      const linkedId =
        e.costItemId && pricingByItem.has(e.costItemId) ? e.costItemId : null;
      const amountVnd = Math.round(e.quantity * e.unitAmountVnd);
      return {
        costItemId: linkedId,
        nameSnapshot: e.name,
        categorySnapshot: e.category,
        pricingSnapshot: linkedId
          ? (pricingByItem.get(linkedId) as CostPricingType)
          : ("PER_UNIT" as CostPricingType),
        quantity: e.quantity,
        unitAmountVnd: e.unitAmountVnd,
        amountVnd,
        note: normOpt(e.note),
      };
    });

    const extraCostTotalVnd = extraCostRecords.reduce(
      (s, r) => s + r.amountVnd,
      0
    );
    const totalFeeVnd = data.customerFeeVnd;
    const profitVnd = totalFeeVnd - baseCostVnd - extraCostTotalVnd;
    const code = await nextOrderCode(new Date());
    const createdById = await getActorUserId();

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          code,
          status: data.status,
          customerId: customer.id,
          serviceId: service.id,
          chargeableWeightKg: totals.totalChargeableWeight,
          volumetricDivisor: service.volumetricDivisor,
          baseRateSnapshotVnd: tier.amountVnd,
          serviceCostRateIdSnapshot: tier.id,
          baseCostVnd,
          extraCostTotalVnd,
          totalFeeVnd,
          profitVnd,
          pickupMethod: data.pickupMethod,
          createdById,
          notes: normOpt(data.notes),
        },
        select: { id: true },
      });

      await tx.package.createMany({
        data: data.packages.map((p, i) => ({
          orderId: order.id,
          description: normOpt(p.description),
          actualWeightKg: p.actualWeightKg,
          lengthCm: p.lengthCm,
          widthCm: p.widthCm,
          heightCm: p.heightCm,
          volumetricWeightKg: packageWeights[i].volumetricWeightKg,
          chargeableWeightKg: packageWeights[i].chargeableWeightKg,
        })),
      });

      if (extraCostRecords.length > 0) {
        await tx.orderExtraCost.createMany({
          data: extraCostRecords.map((r) => ({ ...r, orderId: order.id })),
        });
      }

      // Supplies consumed for this order → OUT stock movements + deduct stock.
      // Stock is allowed to go negative: the order (goods shipped) is the
      // source of truth; a negative figure signals the count needs a stocktake.
      for (const used of data.suppliesUsed) {
        const supply = await tx.supply.findUnique({
          where: { id: used.supplyId },
          select: { id: true, currentStock: true },
        });
        if (!supply) continue;
        const stockAfter = supply.currentStock - used.quantity;
        await tx.stockMovement.create({
          data: {
            supplyId: supply.id,
            type: "OUT",
            quantityDelta: -used.quantity,
            stockAfter,
            orderId: order.id,
            createdById,
          },
        });
        await tx.supply.update({
          where: { id: supply.id },
          data: { currentStock: stockAfter },
        });
      }

      return order;
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/packages");
    revalidatePath("/admin/supplies");
    revalidatePath("/admin/dashboard");
    redirect(`/admin/orders/${created.id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { ok: false, formError: "Không thể lưu đơn hàng. Vui lòng thử lại." };
  }
}

export async function updateOrder(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = orderInputSchema.safeParse(parseOrderFormData(formData));
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".") || "_";
      fieldErrors[k] = fieldErrors[k] ?? [];
      fieldErrors[k].push(issue.message);
    }
    return { ok: false, fieldErrors };
  }
  const data = parsed.data;

  try {
    const existing = await prisma.order.findUnique({
      where: { id },
      include: { extraCosts: { select: { amountVnd: true } } },
    });
    if (!existing) {
      return { ok: false, formError: "Không tìm thấy đơn hàng." };
    }

    const service = await prisma.shippingService.findUnique({
      where: { id: data.serviceId },
      select: { id: true, volumetricDivisor: true },
    });
    if (!service) {
      return { ok: false, fieldErrors: { serviceId: ["Vui lòng chọn dịch vụ."] } };
    }

    const tiers = await loadTiers(service.id);
    let tier, baseCostVnd;
    try {
      ({ tier, baseCostVnd } = priceOrder(data.chargeableWeightKg, tiers));
    } catch {
      return { ok: false, fieldErrors: { chargeableWeightKg: ["Không có bậc giá phù hợp cho cân tính cước này."] } };
    }

    const extraCostTotalVnd = existing.extraCosts.reduce(
      (s, e) => s + e.amountVnd,
      0
    );
    const totalFeeVnd = data.customerFeeVnd;
    const profitVnd = totalFeeVnd - baseCostVnd - extraCostTotalVnd;

    await prisma.order.update({
      where: { id },
      data: {
        status: data.status,
        customerId: data.customerId,
        serviceId: service.id,
        chargeableWeightKg: data.chargeableWeightKg,
        volumetricDivisor: service.volumetricDivisor,
        baseRateSnapshotVnd: tier.amountVnd,
        serviceCostRateIdSnapshot: tier.id,
        baseCostVnd,
        extraCostTotalVnd,
        totalFeeVnd,
        profitVnd,
        pickupMethod: data.pickupMethod,
        notes: normOpt(data.notes),
      },
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${id}`);
    revalidatePath("/admin/dashboard");
    redirect(`/admin/orders/${id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { ok: false, formError: "Không thể lưu đơn hàng. Vui lòng thử lại." };
  }
}

export async function recalcOrderTotals(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { extraCosts: { select: { amountVnd: true } } },
  });
  if (!order) return;
  const extraCostTotalVnd = order.extraCosts.reduce(
    (s, e) => s + e.amountVnd,
    0
  );
  const profitVnd =
    order.totalFeeVnd - order.baseCostVnd - extraCostTotalVnd;
  await prisma.order.update({
    where: { id: orderId },
    data: { extraCostTotalVnd, profitVnd },
  });
}
