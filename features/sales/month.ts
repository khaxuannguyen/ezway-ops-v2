// Tiện ích chọn tháng cho các trang thống kê sale.
// File thuần (không import Prisma) để component client dùng được.

export interface MonthRange {
  /** Năm. */
  year: number;
  /** Tháng 1-12. */
  month: number;
  /** Đầu tháng (gồm). */
  start: Date;
  /** Đầu tháng kế (loại trừ). */
  end: Date;
  /** Khoá dạng YYYY-MM. */
  key: string;
  /** Nhãn hiển thị, vd "Tháng 5/2026". */
  label: string;
}

function makeRange(year: number, monthIndex: number): MonthRange {
  return {
    year,
    month: monthIndex + 1,
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1),
    key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    label: `Tháng ${monthIndex + 1}/${year}`,
  };
}

/** Phân giải tham số ?month=YYYY-MM, mặc định tháng hiện tại nếu thiếu/sai. */
export function resolveMonth(param?: string): MonthRange {
  const now = new Date();
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12) {
      return makeRange(y, m - 1);
    }
  }
  return makeRange(now.getFullYear(), now.getMonth());
}

/** Danh sách N tháng gần nhất (mới nhất trước) cho ô chọn tháng. */
export function recentMonths(count = 12): { key: string; label: string }[] {
  const now = new Date();
  const out: { key: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    // Dựng Date để JS tự chuẩn hoá khi tháng âm (lùi qua năm trước).
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const r = makeRange(d.getFullYear(), d.getMonth());
    out.push({ key: r.key, label: r.label });
  }
  return out;
}
