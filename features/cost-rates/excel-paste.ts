// Parse a price table copy-pasted from Excel OR loaded from a CSV/TSV file.
//
// Each data line has 2 columns: weight spec + price.
//   Column 1 (weight spec):
//     "0.5" / "0,5"   -> fixed point (FIXED_TOTAL), min = max = weight
//     "21-44"          -> per-kg range (PER_KG)
//     "300+"           -> per-kg open-ended range, max = OPEN_ENDED_MAX
//   Column 2 (price): thousands separators are stripped, so "1,230,015"
//     and "1.230.015" both become 1230015.
//
// Delimiter detection per line: Tab > semicolon > comma / multi-space.
// Header rows (price column not numeric) are skipped.

export const OPEN_ENDED_MAX = 9999;

export interface ParsedFixedPoint {
  weightKg: number;
  amountVnd: number;
}

export interface ParsedPerKgRow {
  minWeightKg: number;
  maxWeightKg: number;
  amountVnd: number;
}

export interface ExcelPasteResult {
  fixedPoints: ParsedFixedPoint[];
  perKgRows: ParsedPerKgRow[];
  skipped: string[];
}

function toNumber(raw: string): number {
  return Number(raw.trim().replace(",", "."));
}

function parseAmount(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function splitCells(line: string): string[] {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes(";")) return line.split(";");
  return line.split(/,|\s{2,}/);
}

export function parseExcelPaste(text: string): ExcelPasteResult {
  const fixedPoints: ParsedFixedPoint[] = [];
  const perKgRows: ParsedPerKgRow[] = [];
  const skipped: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") continue;

    const cells = splitCells(line).map((c) => c.trim());
    if (cells.length < 2) {
      skipped.push(line);
      continue;
    }

    const weightSpec = cells[0];
    // The price is everything after column 1 — joining handles a price that
    // was itself split when commas double as both delimiter and separator.
    const amount = parseAmount(cells.slice(1).join(""));
    if (amount === null) {
      skipped.push(line);
      continue;
    }

    const single = weightSpec.match(/^(\d+(?:[.,]\d+)?)$/);
    const range = weightSpec.match(
      /^(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)$/
    );
    const open = weightSpec.match(/^(\d+(?:[.,]\d+)?)\s*\+$/);

    if (single) {
      const w = toNumber(single[1]);
      if (w > 0) {
        fixedPoints.push({ weightKg: w, amountVnd: amount });
      } else {
        skipped.push(line);
      }
    } else if (range) {
      const min = toNumber(range[1]);
      const max = toNumber(range[2]);
      if (max >= min && max > 0) {
        perKgRows.push({ minWeightKg: min, maxWeightKg: max, amountVnd: amount });
      } else {
        skipped.push(line);
      }
    } else if (open) {
      const min = toNumber(open[1]);
      perKgRows.push({
        minWeightKg: min,
        maxWeightKg: OPEN_ENDED_MAX,
        amountVnd: amount,
      });
    } else {
      skipped.push(line);
    }
  }

  return { fixedPoints, perKgRows, skipped };
}

// Parse a single column of prices (one price per line).
// IMPORTANT: a comma here is a thousands separator ("652,982"), NOT a column
// delimiter — so we only split columns on Tab or semicolon, then strip every
// non-digit from the price cell. Lines with no digits (headers/blanks) skip.
export function parsePriceColumn(text: string): number[] {
  const prices: number[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") continue;
    let cell = line;
    if (line.includes("\t")) {
      const parts = line.split("\t");
      cell = parts[parts.length - 1];
    } else if (line.includes(";")) {
      const parts = line.split(";");
      cell = parts[parts.length - 1];
    }
    const digits = cell.replace(/[^\d]/g, "");
    if (digits === "") continue;
    const n = Number(digits);
    if (Number.isFinite(n)) prices.push(n);
  }
  return prices;
}
