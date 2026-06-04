import ExcelJS from "exceljs";
import type { InvoiceRow } from "@/features/invoices/queries";

/**
 * Generate Excel buffer cho danh sách HDDT — admin gửi kế toán đối soát.
 * Output: 1 sheet "HDDT", header tiếng Việt, format VNĐ.
 */
export async function generateInvoicesExcel(
  rows: InvoiceRow[],
  periodLabel: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "EZWAY Ops";
  wb.created = new Date();

  const ws = wb.addWorksheet("HDDT");
  ws.columns = [
    { header: "STT", key: "idx", width: 6 },
    { header: "Số HDDT", key: "invoiceNumber", width: 14 },
    { header: "Mã tra cứu", key: "lookupCode", width: 16 },
    { header: "Ngày xuất", key: "issuedAt", width: 12, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Mã đơn", key: "orderCode", width: 18 },
    { header: "Mã khách", key: "customerCode", width: 12 },
    { header: "Tên khách", key: "customerName", width: 28 },
    { header: "Tiền HDDT (VNĐ)", key: "totalVnd", width: 18, style: { numFmt: "#,##0" } },
    { header: "Trạng thái", key: "status", width: 12 },
    { header: "Người ghi", key: "recordedBy", width: 20 },
    { header: "Ghi chú", key: "notes", width: 30 },
  ];

  // Header style
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEBF0F8" },
  };

  // Data rows
  rows.forEach((r, i) => {
    ws.addRow({
      idx: i + 1,
      invoiceNumber: r.invoiceNumber,
      lookupCode: r.lookupCode ?? "",
      issuedAt: r.issuedAt,
      orderCode: r.orderCode,
      customerCode: r.customerCode,
      customerName: r.customerName,
      totalVnd: r.totalVnd,
      status: r.status === "ISSUED" ? "Đã xuất" : "Đã huỷ",
      recordedBy: r.recordedBy.name,
      notes: r.notes ?? "",
    });
  });

  // Footer total (only ISSUED)
  const issuedTotal = rows
    .filter((r) => r.status === "ISSUED")
    .reduce((s, r) => s + r.totalVnd, 0);
  const lastRow = ws.addRow({
    customerName: `Tổng (chỉ HDDT đã xuất, ${periodLabel})`,
    totalVnd: issuedTotal,
  });
  lastRow.font = { bold: true };
  lastRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF4F6FB" },
  };

  // Freeze header
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
