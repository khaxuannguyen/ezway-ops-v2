"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildOrderCode, buildPickupCode } from "@/lib/codegen";
import { getCurrentUser, requireRole, type CurrentUser } from "@/lib/auth";
import {
  calculateOrderPackageTotals,
  computePackageWeights,
  priceOrder,
  type RateTier,
} from "@/lib/domain";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import type { CostPricingType } from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  orderCreateInputSchema,
  orderInputSchema,
  parseOrderCreateFormData,
  parseOrderFormData,
  type RecipientBlockInput,
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

/**
 * Hoàn kho mọi OUT movement chưa được hoàn của đơn này (idempotent qua refundedAt).
 * Gọi trong transaction khi đơn chuyển sang CANCELLED.
 */
async function refundOrderStockMovements(
  tx: Prisma.TransactionClient,
  orderId: string,
  orderCode: string,
  actorUserId: string
): Promise<void> {
  const outs = await tx.stockMovement.findMany({
    where: { orderId, type: "OUT", refundedAt: null },
    select: { id: true, supplyId: true, quantityDelta: true },
  });
  for (const out of outs) {
    // OUT có quantityDelta âm; hoàn = số dương ngược dấu.
    const refundQty = -out.quantityDelta;
    if (refundQty <= 0) continue;
    const supply = await tx.supply.findUnique({
      where: { id: out.supplyId },
      select: { currentStock: true },
    });
    if (!supply) continue;
    const stockAfter = supply.currentStock + refundQty;
    await tx.stockMovement.create({
      data: {
        supplyId: out.supplyId,
        type: "IN",
        quantityDelta: refundQty,
        stockAfter,
        orderId,
        createdById: actorUserId,
        note: `Tự hoàn kho do huỷ đơn ${orderCode}`,
      },
    });
    await tx.supply.update({
      where: { id: out.supplyId },
      data: { currentStock: stockAfter },
    });
    await tx.stockMovement.update({
      where: { id: out.id },
      data: { refundedAt: new Date() },
    });
  }
}

/**
 * Resolve người nhận cho đơn:
 *  - Nếu form có recipientId hợp lệ → tái dùng
 *  - Ngược lại tạo mới (nếu có đủ contactName + phone + address)
 *  - Nếu form trống hoàn toàn → trả về null
 */
async function resolveRecipientId(
  tx: Prisma.TransactionClient,
  customerId: string,
  block: RecipientBlockInput
): Promise<string | null> {
  if (block.recipientId && block.recipientId.trim() !== "") {
    const existing = await tx.recipient.findUnique({
      where: { id: block.recipientId },
      select: { id: true },
    });
    return existing?.id ?? null;
  }
  if (!block.contactName || !block.phone || !block.address) {
    return null;
  }
  const created = await tx.recipient.create({
    data: {
      customerId: block.saveAsReusable ? customerId : null,
      contactName: block.contactName.trim(),
      phone: block.phone.trim(),
      nationalId: normOpt(block.nationalId ?? undefined),
      address: block.address.trim(),
    },
    select: { id: true },
  });
  return created.id;
}

/** Validate assignedTo phải là user role STAFF/DRIVER + isActive. Trả null nếu không hợp lệ. */
async function resolveAssignedToUserId(
  formValue: string | undefined
): Promise<string | null> {
  const picked = (formValue ?? "").trim();
  if (!picked) return null;
  const u = await prisma.user.findUnique({
    where: { id: picked },
    select: { role: true, isActive: true },
  });
  if (!u || !u.isActive) return null;
  return u.role === "STAFF" || u.role === "DRIVER" ? picked : null;
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

/**
 * Quyết định nhân viên sale của đơn:
 * - Người tạo/sửa là SALE → luôn gán cho chính họ (không cho chọn người khác).
 * - ADMIN/STAFF → dùng giá trị chọn trong form, chỉ chấp nhận nếu là tài khoản SALE.
 */
async function resolveSalesUserId(
  actor: CurrentUser,
  formValue: string | undefined
): Promise<string | null> {
  if (actor.role === "SALE") return actor.id;
  const picked = (formValue ?? "").trim();
  if (!picked) return null;
  const u = await prisma.user.findUnique({
    where: { id: picked },
    select: { role: true },
  });
  return u && u.role === "SALE" ? picked : null;
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
        select: { id: true, name: true, phone: true, address: true },
      }),
    ]);
    if (!service) {
      return { ok: false, fieldErrors: { serviceId: ["Vui lòng chọn dịch vụ."] } };
    }
    if (!customer) {
      return { ok: false, fieldErrors: { customerId: ["Vui lòng chọn khách hàng."] } };
    }

    const actor = await getCurrentUser();
    if (!actor) {
      return {
        ok: false,
        formError: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      };
    }

    // Nhánh A: có pickupCode → load pickup hiện có và dùng packages của nó.
    // Nhánh B: không có pickupCode → tạo PickupRequest stub từ form bill packages + customer info.
    const hasPickupCode = !!(data.pickupCode && data.pickupCode.trim() !== "");
    let existingPickupId: string | null = null;
    let existingPickupPackageIds: string[] = [];
    let packageInputs: Array<{
      description: string | null;
      actualWeightKg: number;
      lengthCm: number;
      widthCm: number;
      heightCm: number;
    }> = [];

    if (hasPickupCode) {
      const pickup = await prisma.pickupRequest.findUnique({
        where: { code: data.pickupCode!.trim() },
        select: {
          id: true,
          orderId: true,
          createdById: true,
          packages: {
            select: {
              id: true,
              description: true,
              actualWeightKg: true,
              lengthCm: true,
              widthCm: true,
              heightCm: true,
            },
          },
        },
      });
      if (!pickup) {
        return {
          ok: false,
          fieldErrors: { pickupCode: ["Không tìm thấy lệnh lấy hàng với mã này."] },
        };
      }
      if (pickup.orderId) {
        return {
          ok: false,
          fieldErrors: { pickupCode: ["Lệnh lấy hàng này đã gắn cho đơn khác."] },
        };
      }
      if (pickup.packages.length === 0) {
        return {
          ok: false,
          fieldErrors: { pickupCode: ["Lệnh lấy hàng chưa có kiện hàng."] },
        };
      }
      if (actor.role === "SALE" && pickup.createdById !== actor.id) {
        return {
          ok: false,
          fieldErrors: {
            pickupCode: ["Mã lệnh lấy hàng này không thuộc về bạn."],
          },
        };
      }
      existingPickupId = pickup.id;
      existingPickupPackageIds = pickup.packages.map((p) => p.id);
      packageInputs = pickup.packages.map((p) => ({
        description: p.description,
        actualWeightKg: Number(p.actualWeightKg),
        lengthCm: p.lengthCm,
        widthCm: p.widthCm,
        heightCm: p.heightCm,
      }));
    } else {
      // Nhánh B: lấy packages từ form Bill.
      packageInputs = data.packages.map((p) => ({
        description: normOpt(p.description),
        actualWeightKg: p.actualWeightKg,
        lengthCm: p.lengthCm,
        widthCm: p.widthCm,
        heightCm: p.heightCm,
      }));
    }

    // Cân quy đổi tính theo hệ số dịch vụ.
    const packageWeights = packageInputs.map((p) =>
      computePackageWeights(p, service.volumetricDivisor)
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
          pickupCode: ["Không có bậc giá phù hợp cho tổng cân tính cước."],
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
    const createdById = actor.id;
    const salesUserId = await resolveSalesUserId(actor, data.salesUserId);

    const assignedToUserId = await resolveAssignedToUserId(data.assignedToUserId);

    const created = await prisma.$transaction(async (tx) => {
      const recipientId = await resolveRecipientId(tx, customer.id, data.recipient);
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
          salesUserId,
          notes: normOpt(data.notes),
          recipientId,
          assignedToUserId,
        },
        select: { id: true },
      });

      // Pickup: branch theo có/không pickupCode.
      if (existingPickupId) {
        // Nhánh A: gắn pickup hiện có vào đơn + cập nhật cân quy đổi của kiện.
        await tx.pickupRequest.update({
          where: { id: existingPickupId },
          data: { orderId: order.id },
        });
        for (let i = 0; i < existingPickupPackageIds.length; i++) {
          await tx.package.update({
            where: { id: existingPickupPackageIds[i] },
            data: {
              volumetricWeightKg: packageWeights[i].volumetricWeightKg,
              chargeableWeightKg: packageWeights[i].chargeableWeightKg,
            },
          });
        }
      } else {
        // Nhánh B: tạo PickupRequest stub với address/contact lấy từ customer
        // + ghi packages từ form Bill.
        const pkCount = await tx.pickupRequest.count({
          where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        });
        const pickupCodeNew = buildPickupCode(pkCount + 1, new Date());
        const stub = await tx.pickupRequest.create({
          data: {
            code: pickupCodeNew,
            createdById,
            currentStatus: "PENDING",
            pickupAddress: customer.address ?? "(chưa rõ)",
            pickupContactName: customer.name,
            pickupContactPhone: customer.phone,
            orderId: order.id,
            notes: "Tự tạo từ form Order — sale không có pickup riêng",
          },
          select: { id: true },
        });
        await tx.package.createMany({
          data: packageInputs.map((p, i) => ({
            pickupRequestId: stub.id,
            description: p.description,
            actualWeightKg: p.actualWeightKg,
            lengthCm: p.lengthCm,
            widthCm: p.widthCm,
            heightCm: p.heightCm,
            volumetricWeightKg: packageWeights[i].volumetricWeightKg,
            chargeableWeightKg: packageWeights[i].chargeableWeightKg,
          })),
        });
        await tx.pickupStatusLog.create({
          data: {
            pickupRequestId: stub.id,
            fromStatus: null,
            toStatus: "PENDING",
            byUserId: createdById,
            note: "Tự tạo lúc sale tạo đơn (không có pickup riêng)",
          },
        });
      }

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
    revalidatePath("/admin/pickups");
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
      include: {
        extraCosts: { select: { amountVnd: true } },
        pickupRequest: {
          select: {
            packages: {
              select: {
                actualWeightKg: true,
                lengthCm: true,
                widthCm: true,
                heightCm: true,
              },
            },
          },
        },
      },
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

    // Cân tính cước lấy lại từ kiện hàng của lệnh lấy hàng (theo hệ số dịch vụ).
    const pkgs = existing.pickupRequest?.packages ?? [];
    const chargeableWeightKg =
      pkgs.length > 0
        ? calculateOrderPackageTotals(
            pkgs.map((p) =>
              computePackageWeights(
                {
                  actualWeightKg: Number(p.actualWeightKg),
                  lengthCm: p.lengthCm,
                  widthCm: p.widthCm,
                  heightCm: p.heightCm,
                },
                service.volumetricDivisor
              )
            )
          ).totalChargeableWeight
        : Number(existing.chargeableWeightKg);

    const tiers = await loadTiers(service.id);
    let tier, baseCostVnd;
    try {
      ({ tier, baseCostVnd } = priceOrder(chargeableWeightKg, tiers));
    } catch {
      return {
        ok: false,
        formError: "Không có bậc giá phù hợp cho cân tính cước của đơn này.",
      };
    }

    const extraCostTotalVnd = existing.extraCosts.reduce(
      (s, e) => s + e.amountVnd,
      0
    );
    const totalFeeVnd = data.customerFeeVnd;
    const profitVnd = totalFeeVnd - baseCostVnd - extraCostTotalVnd;

    const actor = await getCurrentUser();
    if (!actor) {
      return {
        ok: false,
        formError: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      };
    }
    const salesUserId = await resolveSalesUserId(actor, data.salesUserId);
    const assignedToUserId = await resolveAssignedToUserId(data.assignedToUserId);

    await prisma.$transaction(async (tx) => {
      const recipientId = await resolveRecipientId(tx, data.customerId, data.recipient);

      await tx.order.update({
        where: { id },
        data: {
          status: data.status,
          customerId: data.customerId,
          serviceId: service.id,
          salesUserId,
          chargeableWeightKg,
          volumetricDivisor: service.volumetricDivisor,
          baseRateSnapshotVnd: tier.amountVnd,
          serviceCostRateIdSnapshot: tier.id,
          baseCostVnd,
          extraCostTotalVnd,
          totalFeeVnd,
          profitVnd,
          pickupMethod: data.pickupMethod,
          notes: normOpt(data.notes),
          recipientId,
          assignedToUserId,
        },
      });

      // Huỷ đơn → hoàn kho mọi vật tư đã xuất cho đơn này (chưa hoàn lần nào).
      // Idempotent: refundedAt đánh dấu OUT đã hoàn → tránh hoàn 2 lần.
      if (data.status === "CANCELLED") {
        await refundOrderStockMovements(tx, id, existing.code, actor.id);
      }
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${id}`);
    revalidatePath("/admin/supplies");
    revalidatePath("/admin/dashboard");
    redirect(`/admin/orders/${id}`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { ok: false, formError: "Không thể lưu đơn hàng. Vui lòng thử lại." };
  }
}

/**
 * Đánh dấu đơn đã được admin đẩy lên carrier upstream (Kango/KSN/Go).
 * Lưu carrier code + tracking + ghi chú.
 */
export async function markOrderForwarded(
  orderId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireRole("ADMIN", "STAFF");

  const carrierCode = (formData.get("carrierCode") ?? "").toString().trim();
  const carrierTrackingNumber = (formData.get("carrierTrackingNumber") ?? "").toString().trim();
  const carrierReferenceCode = (formData.get("carrierReferenceCode") ?? "").toString().trim();
  const carrierNote = (formData.get("carrierNote") ?? "").toString().trim();

  if (!carrierCode) {
    return { ok: false, fieldErrors: { carrierCode: ["Vui lòng chọn carrier."] } };
  }
  if (!carrierTrackingNumber) {
    return {
      ok: false,
      fieldErrors: { carrierTrackingNumber: ["Vui lòng nhập mã tracking carrier trả."] },
    };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, deletedAt: true },
  });
  if (!order || order.deletedAt) {
    return { ok: false, formError: "Không tìm thấy đơn hàng." };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      carrierForwardedAt: new Date(),
      carrierForwardedById: actor.id,
      carrierCode: carrierCode.toUpperCase(),
      carrierTrackingNumber,
      carrierReferenceCode: carrierReferenceCode || null,
      carrierNote: carrierNote || null,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/processing");
  return { ok: true, data: { id: orderId } };
}

/**
 * Wrapper trả về Promise<void> để gắn vào `<form action>` (Next.js yêu cầu).
 * Tái dùng logic của unmarkOrderForwarded.
 */
export async function unmarkOrderForwardedForm(
  orderId: string,
  formData: FormData
): Promise<void> {
  void formData;
  await unmarkOrderForwarded(orderId);
}

/** Bỏ đánh dấu đã đẩy carrier (ADMIN dùng khi ghi nhầm hoặc cần đẩy lại). */
export async function unmarkOrderForwarded(
  orderId: string
): Promise<ActionResult<{ id: string }>> {
  await requireRole("ADMIN");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!order) return { ok: false, formError: "Không tìm thấy đơn hàng." };
  await prisma.order.update({
    where: { id: orderId },
    data: {
      carrierForwardedAt: null,
      carrierForwardedById: null,
      carrierCode: null,
      carrierTrackingNumber: null,
      carrierReferenceCode: null,
      carrierNote: null,
    },
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/processing");
  return { ok: true, data: { id: orderId } };
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
