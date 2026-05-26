// Sinh file Excel mẫu bảng lương cho EZWAY 2026 — dùng tạm 2-3 tháng đầu
// trong khi chờ code Payroll Phase C trong app.
//
// Chạy: node scripts/generate-payroll-template.mjs
// Output: docs/templates/payroll-template-2026.xlsx
//
// Áp dụng công thức Việt Nam:
//   BHXH NLĐ: 8% × lương đóng BHXH
//   BHYT NLĐ: 1.5% × lương đóng BHXH
//   BHTN NLĐ: 1% × lương đóng BHXH
//   BHXH/BHYT/BHTN DN: 17.5% + 3% + 1% = 21.5% × lương đóng BHXH
//   TNCN: lũy tiến từng phần (5/10/15/20/25/30/35%) — công thức rút gọn
//   Giảm trừ: 11tr bản thân + 4.4tr/người phụ thuộc
//
// Lưu ý trần đóng BHXH (= 20× lương cơ sở) và BHTN (= 20× lương tối thiểu vùng)
// → admin tự cap input cột "Lương BHXH" nếu vượt. KISS, không hard-code trần.

import ExcelJS from "exceljs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "docs", "templates", "payroll-template-2026.xlsx");

const workbook = new ExcelJS.Workbook();
workbook.creator = "EZWAY Ops";
workbook.created = new Date();

// ──────────────────────────────────────────────────────────────────
// Sheet 1: Bảng lương tháng
// ──────────────────────────────────────────────────────────────────
const ws = workbook.addWorksheet("Bảng lương", {
  views: [{ state: "frozen", ySplit: 3, xSplit: 2 }],
});

// Title
ws.mergeCells("A1:T1");
const title = ws.getCell("A1");
title.value = "BẢNG LƯƠNG THÁNG ___/2026 — CÔNG TY TNHH TM&DV EZWAY";
title.font = { bold: true, size: 14 };
title.alignment = { horizontal: "center", vertical: "middle" };
ws.getRow(1).height = 24;

// Sub-header (3 rows: nhóm / tiêu đề / công thức gợi ý)
const groups = [
  { range: "A2:D2", label: "Nhân sự" },
  { range: "E2:H2", label: "Lương + Phụ cấp" },
  { range: "I2:M2", label: "Bảo hiểm NLĐ trừ (10.5%)" },
  { range: "N2:P2", label: "Thuế TNCN" },
  { range: "Q2:Q2", label: "Net" },
  { range: "R2:U2", label: "Chi phí DN gánh thêm (21.5% BH)" },
];
for (const g of groups) {
  ws.mergeCells(g.range);
  const cell = ws.getCell(g.range.split(":")[0]);
  cell.value = g.label;
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0D7377" },
  };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
    bottom: { style: "thin" },
  };
}

const headers = [
  // Nhân sự
  { key: "stt", label: "STT", width: 5 },
  { key: "name", label: "Họ và tên", width: 24 },
  { key: "taxCode", label: "MST cá nhân", width: 14 },
  { key: "dependents", label: "Người phụ thuộc", width: 9 },
  // Lương + phụ cấp
  { key: "baseSalary", label: "Lương cơ bản", width: 14 },
  { key: "bhxhSalary", label: "Lương BHXH", width: 14 },
  { key: "allowTax", label: "Phụ cấp tính thuế", width: 14 },
  { key: "allowNonTax", label: "Phụ cấp KHÔNG tính thuế", width: 14 },
  // BH NLĐ
  { key: "gross", label: "Gross", width: 14 },
  { key: "bhxhEmp", label: "BHXH (8%)", width: 12 },
  { key: "bhytEmp", label: "BHYT (1.5%)", width: 12 },
  { key: "bhtnEmp", label: "BHTN (1%)", width: 12 },
  { key: "bhEmpTotal", label: "Tổng BH NLĐ", width: 13 },
  // TNCN
  { key: "taxable", label: "Thu nhập tính thuế", width: 14 },
  { key: "pit", label: "Thuế TNCN", width: 12 },
  { key: "pitRate", label: "% TNCN", width: 9 },
  // Net
  { key: "net", label: "Lương Net (chuyển)", width: 14 },
  // BH DN
  { key: "bhxhCo", label: "BHXH DN (17.5%)", width: 14 },
  { key: "bhytCo", label: "BHYT DN (3%)", width: 12 },
  { key: "bhtnCo", label: "BHTN DN (1%)", width: 12 },
  { key: "totalCost", label: "Tổng chi phí DN", width: 15 },
];

const headerRow = ws.getRow(3);
headers.forEach((h, i) => {
  const cell = headerRow.getCell(i + 1);
  cell.value = h.label;
  cell.font = { bold: true };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0F2F1" },
  };
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
    bottom: { style: "thin" },
  };
  ws.getColumn(i + 1).width = h.width;
});
headerRow.height = 30;

// Sample employees (placeholder — admin xoá rồi nhập thật)
const sampleRows = [
  {
    name: "Nguyễn Văn A",
    taxCode: "8123456789",
    dependents: 1,
    baseSalary: 25000000,
    bhxhSalary: 25000000,
    allowTax: 2000000,
    allowNonTax: 730000, // ăn ca ≤ 730k miễn thuế
  },
  {
    name: "Trần Thị B",
    taxCode: "8234567890",
    dependents: 0,
    baseSalary: 15000000,
    bhxhSalary: 15000000,
    allowTax: 0,
    allowNonTax: 730000,
  },
  {
    name: "Phạm Văn C",
    taxCode: "8345678901",
    dependents: 2,
    baseSalary: 18000000,
    bhxhSalary: 18000000,
    allowTax: 0,
    allowNonTax: 730000,
  },
  {
    name: "Lê Thị D",
    taxCode: "8456789012",
    dependents: 0,
    baseSalary: 12000000,
    bhxhSalary: 12000000,
    allowTax: 500000,
    allowNonTax: 730000,
  },
];

const firstDataRow = 4;
sampleRows.forEach((r, i) => {
  const rowNum = firstDataRow + i;
  const row = ws.getRow(rowNum);
  row.getCell("A").value = i + 1;
  row.getCell("B").value = r.name;
  row.getCell("C").value = r.taxCode;
  row.getCell("D").value = r.dependents;
  row.getCell("E").value = r.baseSalary;
  row.getCell("F").value = r.bhxhSalary;
  row.getCell("G").value = r.allowTax;
  row.getCell("H").value = r.allowNonTax;
  // Formulas
  row.getCell("I").value = { formula: `E${rowNum}+G${rowNum}+H${rowNum}` };
  row.getCell("J").value = { formula: `ROUND(F${rowNum}*0.08,0)` };
  row.getCell("K").value = { formula: `ROUND(F${rowNum}*0.015,0)` };
  row.getCell("L").value = { formula: `ROUND(F${rowNum}*0.01,0)` };
  row.getCell("M").value = { formula: `J${rowNum}+K${rowNum}+L${rowNum}` };
  // Thu nhập tính thuế = Gross − BH NLĐ − Phụ cấp không tính thuế − 11tr (bản thân) − 4.4tr × phụ thuộc
  // MAX(0, ...) tránh số âm
  row.getCell("N").value = {
    formula: `MAX(0,I${rowNum}-M${rowNum}-H${rowNum}-11000000-D${rowNum}*4400000)`,
  };
  // TNCN — lũy tiến rút gọn theo công thức 2 (TT 111/2013)
  row.getCell("O").value = {
    formula: `ROUND(IF(N${rowNum}<=0,0,IF(N${rowNum}<=5000000,N${rowNum}*0.05,IF(N${rowNum}<=10000000,N${rowNum}*0.1-250000,IF(N${rowNum}<=18000000,N${rowNum}*0.15-750000,IF(N${rowNum}<=32000000,N${rowNum}*0.2-1650000,IF(N${rowNum}<=52000000,N${rowNum}*0.25-3250000,IF(N${rowNum}<=80000000,N${rowNum}*0.3-5850000,N${rowNum}*0.35-9850000))))))),0)`,
  };
  // % TNCN trên gross
  row.getCell("P").value = {
    formula: `IF(I${rowNum}>0,O${rowNum}/I${rowNum},0)`,
  };
  // Net = Gross − BH NLĐ − TNCN
  row.getCell("Q").value = { formula: `I${rowNum}-M${rowNum}-O${rowNum}` };
  // BH DN
  row.getCell("R").value = { formula: `ROUND(F${rowNum}*0.175,0)` };
  row.getCell("S").value = { formula: `ROUND(F${rowNum}*0.03,0)` };
  row.getCell("T").value = { formula: `ROUND(F${rowNum}*0.01,0)` };
  // Tổng chi phí DN = Gross + BH DN
  row.getCell("U").value = {
    formula: `I${rowNum}+R${rowNum}+S${rowNum}+T${rowNum}`,
  };

  // Format money columns
  for (const col of ["E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "Q", "R", "S", "T", "U"]) {
    row.getCell(col).numFmt = "#,##0";
  }
  row.getCell("P").numFmt = "0.00%";
});

// Totals row
const totalsRow = firstDataRow + sampleRows.length;
const totals = ws.getRow(totalsRow);
totals.getCell("A").value = "";
totals.getCell("B").value = "TỔNG";
totals.getCell("B").font = { bold: true };
totals.getCell("B").alignment = { horizontal: "right" };
for (const col of ["E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "Q", "R", "S", "T", "U"]) {
  totals.getCell(col).value = {
    formula: `SUM(${col}${firstDataRow}:${col}${totalsRow - 1})`,
  };
  totals.getCell(col).font = { bold: true };
  totals.getCell(col).numFmt = "#,##0";
  totals.getCell(col).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF9C4" },
  };
}

// Add borders to data + totals
for (let r = firstDataRow; r <= totalsRow; r++) {
  for (let c = 1; c <= headers.length; c++) {
    ws.getRow(r).getCell(c).border = {
      top: { style: "thin", color: { argb: "FFCCCCCC" } },
      left: { style: "thin", color: { argb: "FFCCCCCC" } },
      right: { style: "thin", color: { argb: "FFCCCCCC" } },
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    };
  }
}

// ──────────────────────────────────────────────────────────────────
// Sheet 2: Hướng dẫn + công thức
// ──────────────────────────────────────────────────────────────────
const guide = workbook.addWorksheet("Hướng dẫn");
guide.columns = [{ width: 28 }, { width: 80 }];

const guideRows = [
  ["MỤC", "GIẢI THÍCH"],
  [
    "Lương cơ bản (E)",
    "Lương ghi trên HĐLĐ, KHÔNG kể phụ cấp. Phải ≥ lương tối thiểu vùng (vùng I: 4.96tr 2026).",
  ],
  [
    "Lương BHXH (F)",
    "Lương căn cứ đóng BHXH/BHYT/BHTN. Thường = lương cơ bản. Trần: 20× lương cơ sở (~46.8tr); BHTN trần 20× lương tối thiểu vùng (~99.2tr). Nếu vượt trần, admin cap input ở đây.",
  ],
  [
    "Phụ cấp tính thuế (G)",
    "Phụ cấp chức vụ, thưởng, lương tháng 13... — TÍNH vào TNCN.",
  ],
  [
    "Phụ cấp KHÔNG tính thuế (H)",
    "Ăn ca ≤ 730k/tháng, công tác phí thực chi, điện thoại theo định mức công ty, đồng phục ≤ 5tr/năm. Có VAT chứng từ hợp lệ. Hiện default 730k (ăn ca).",
  ],
  ["", ""],
  ["TÍNH TỰ ĐỘNG", ""],
  ["Gross (I)", "= E + G + H"],
  ["BHXH NLĐ (J)", "= 8% × F (làm tròn)"],
  ["BHYT NLĐ (K)", "= 1.5% × F"],
  ["BHTN NLĐ (L)", "= 1% × F"],
  ["Tổng BH NLĐ (M)", "= J + K + L (= 10.5% × F)"],
  [
    "Thu nhập tính thuế (N)",
    "= MAX(0, Gross − Tổng BH NLĐ − Phụ cấp không tính thuế − 11tr (bản thân) − 4.4tr × Số người phụ thuộc)",
  ],
  [
    "Thuế TNCN (O)",
    "Lũy tiến từng phần 7 bậc (5/10/15/20/25/30/35%). Dùng công thức rút gọn TT 111/2013:\n  ≤5tr: 5%×N\n  5-10tr: 10%×N - 250k\n  10-18tr: 15%×N - 750k\n  18-32tr: 20%×N - 1.65tr\n  32-52tr: 25%×N - 3.25tr\n  52-80tr: 30%×N - 5.85tr\n  >80tr: 35%×N - 9.85tr",
  ],
  ["Net (Q)", "= Gross − Tổng BH NLĐ − TNCN (đây là số chuyển khoản cho NS)"],
  ["BHXH DN (R)", "= 17.5% × F (gồm hưu trí 14% + ốm đau 3% + TNLĐ 0.5%)"],
  ["BHYT DN (S)", "= 3% × F"],
  ["BHTN DN (T)", "= 1% × F"],
  ["Tổng chi phí DN (U)", "= Gross + R + S + T (= Gross + 21.5% × F)"],
  ["", ""],
  ["WORKFLOW MỖI THÁNG", ""],
  ["1.", "Copy sheet 'Bảng lương' sang sheet mới đặt tên 'T05-2026', 'T06-2026'..."],
  ["2.", "Sửa tiêu đề tháng ở A1"],
  ["3.", "Cập nhật cột E, F, G, H nếu có biến động (NS mới, đổi lương, phụ thuộc)"],
  ["4.", "Kiểm tra cột N (thu nhập tính thuế) và O (TNCN) khớp logic"],
  ["5.", "Tổng chi phí DN (U) cuối tháng → cộng dồn vào sổ chi phí Accounting (TK 642 Chi phí quản lý)"],
  ["6.", "Cuối quý: gửi kế toán dịch vụ tổng hợp BH NLĐ (M) + BH DN (R+S+T) để khai báo BHXH + tổng TNCN (O) để khai 05/KK-TNCN"],
  ["", ""],
  ["RỦI RO / LƯU Ý", ""],
  ["•", "Trần BHXH/BHTN: nếu lương BHXH >46.8tr (BHXH) hoặc >99.2tr (BHTN), CAP cột F trước khi formula chạy. Hoặc tách thành cột bhxhBase và bhtnBase nếu khác nhau."],
  ["•", "Quyết toán năm TNCN: cuối năm, ai có nhiều nguồn thu nhập (ngoài lương EZWAY) tự khai. Kế toán dịch vụ lo."],
  ["•", "NS vào/ra giữa tháng: tính prorate theo ngày làm việc. Sửa cột E, G manual."],
  ["•", "Nếu đổi % BHXH/lương cơ sở/giảm trừ TNCN: sửa công thức trong sheet này 1 lần, copy sang tháng mới."],
];

guideRows.forEach((r, i) => {
  const row = guide.getRow(i + 1);
  row.getCell(1).value = r[0];
  row.getCell(2).value = r[1];
  row.getCell(1).font = { bold: true };
  row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  if (i === 0 || r[0] === "TÍNH TỰ ĐỘNG" || r[0] === "WORKFLOW MỖI THÁNG" || r[0] === "RỦI RO / LƯU Ý") {
    row.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0D7377" },
    };
    row.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.getCell(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0D7377" },
    };
    row.getCell(2).font = { bold: true, color: { argb: "FFFFFFFF" } };
  }
});

// Save
await workbook.xlsx.writeFile(outPath);
console.log("Generated:", outPath);
