// Rule-based category suggestion for startup expenses.
// Matches keywords in the expense item name to a category. Order matters:
// the most distinctive categories are checked first. Returns null when no
// keyword matches — a suggestion only, the admin can always override.

import type { ExpenseCategory } from "@/app/generated/prisma/enums";

interface CategoryRule {
  category: ExpenseCategory;
  keywords: string[];
}

const RULES: CategoryRule[] = [
  {
    category: "OPENING_BRANDING",
    keywords: ["bàn thờ", "thần tài", "thổ địa", "ông địa", "đồ thờ", "nhang", "hoa quả", "led", "khai trương", "domain", "tên miền", "website", "logo", "biển hiệu", "banner", "hình ảnh"],
  },
  {
    category: "FOOD_ENTERTAINMENT",
    keywords: ["ăn uống", "ăn trưa", "ăn tối", "ăn sáng", "ăn cơm", "ăn hàng", "ăn hàn", "cơm trưa", "nước ép", "lẩu", "buffe", "bida", "cà phê", "cafe", "trà sữa", "nhậu", "liên hoan", "tiệc", "ăn vặt"],
  },
  {
    category: "PACKAGING_EQUIPMENT",
    keywords: ["hút chân không", "túi hút", "băng keo", "băng dính", "xốp bột", "thùng carton", "thùng cartoon", "carton", "dao", "kéo", "thước", "cân điện", "đóng gói", "giấy a4", "màng pe", "máy in nhiệt", "xprinter", "in nhiệt", "kéo keo", "găng tay", "bao tay", "bàn lề"],
  },
  {
    category: "OPERATIONS_WAREHOUSE",
    keywords: ["wifi", "internet", "lắp mạng", "ghế", "máy in màu", "in màu", "máy in", "thùng xốp", "vận hành", "tiền điện", "tiền nước", "hoá đơn", "kệ", "xe đẩy"],
  },
];

export function suggestExpenseCategory(
  itemName: string
): ExpenseCategory | null {
  const text = itemName.trim().toLowerCase();
  if (text === "") return null;
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) {
      return rule.category;
    }
  }
  return null;
}
