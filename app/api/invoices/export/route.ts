import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { listInvoicesInPeriod } from "@/features/invoices/queries";
import { generateInvoicesExcel } from "@/lib/invoices/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/export?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Trả file Excel HDDT cho khoảng thời gian.
 * Chỉ ADMIN/STAFF.
 */
export async function GET(request: Request) {
  await requireRole("ADMIN", "STAFF");

  const url = new URL(request.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");

  // Default = tháng hiện tại (1 → cuối tháng).
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const from = fromStr ? new Date(fromStr) : defaultFrom;
  const to = toStr ? new Date(toStr) : defaultTo;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json(
      { error: "Khoảng thời gian không hợp lệ." },
      { status: 400 }
    );
  }

  const rows = await listInvoicesInPeriod({ from, to });
  const monthLabel = `${String(from.getMonth() + 1).padStart(2, "0")}/${from.getFullYear()}`;
  const buffer = await generateInvoicesExcel(rows, monthLabel);

  const filename = `EZWAY_HDDT_${monthLabel.replace("/", "-")}.xlsx`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
