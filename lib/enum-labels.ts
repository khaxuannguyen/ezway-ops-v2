import type { BadgeTone } from "@/components/ui/badge";
import type {
  OrderStatus,
  PaymentStatus,
  PickupMethod,
  ShippingTransportType,
} from "@/app/generated/prisma/enums";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: "Nháp",
  PENDING: "Chờ xử lý",
  CONFIRMED: "Đã xác nhận",
  PICKING_UP: "Đang lấy hàng",
  AT_WAREHOUSE: "Đã về kho",
  IN_TRANSIT: "Đang vận chuyển",
  DELIVERED: "Đã giao",
  CLOSED: "Đã đóng",
  CANCELLED: "Đã huỷ",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  DRAFT: "neutral",
  PENDING: "warning",
  CONFIRMED: "info",
  PICKING_UP: "info",
  AT_WAREHOUSE: "info",
  IN_TRANSIT: "primary",
  DELIVERED: "success",
  CLOSED: "success",
  CANCELLED: "destructive",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PARTIAL: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  UNPAID: "warning",
  PARTIAL: "info",
  PAID: "success",
  REFUNDED: "neutral",
};

export const PICKUP_METHOD_LABEL: Record<PickupMethod, string> = {
  NONE: "Không pickup",
  EZWAY_PICKUP: "EZWay đến lấy",
  CUSTOMER_DROP_OFF: "Khách mang đến",
  THIRD_PARTY: "Bên thứ ba",
};

export const TRANSPORT_TYPE_LABEL: Record<ShippingTransportType, string> = {
  AIR: "Hàng không",
  SEA: "Đường biển",
};

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "DRAFT",
  "PENDING",
  "CONFIRMED",
  "PICKING_UP",
  "AT_WAREHOUSE",
  "IN_TRANSIT",
  "DELIVERED",
  "CLOSED",
  "CANCELLED",
];

import type {
  CostCategory,
  CostPricingType,
  CostRateType,
} from "@/app/generated/prisma/enums";

export const COST_CATEGORY_LABEL: Record<CostCategory, string> = {
  PICKUP: "Lấy hàng",
  PACKAGING: "Đóng gói",
  CUSTOMS_SURCHARGE: "Hải quan & phụ thu",
  OPERATION: "Vận hành",
  OTHER: "Khác",
};

export const COST_CATEGORY_TONE: Record<CostCategory, BadgeTone> = {
  PICKUP: "info",
  PACKAGING: "neutral",
  CUSTOMS_SURCHARGE: "warning",
  OPERATION: "primary",
  OTHER: "neutral",
};

export const COST_PRICING_LABEL: Record<CostPricingType, string> = {
  PER_UNIT: "Theo đơn vị",
  PER_KG: "Theo kg",
  PER_KM: "Theo km",
  FLAT_RATE: "Trọn gói",
  QUOTE: "Báo giá riêng",
};

export const COST_RATE_TYPE_LABEL: Record<CostRateType, string> = {
  FIXED_TOTAL: "Cố định",
  PER_KG: "Theo kg",
};

export const COST_CATEGORY_OPTIONS: CostCategory[] = [
  "PICKUP",
  "PACKAGING",
  "CUSTOMS_SURCHARGE",
  "OPERATION",
  "OTHER",
];

export const COST_PRICING_OPTIONS: CostPricingType[] = [
  "PER_UNIT",
  "PER_KG",
  "PER_KM",
  "FLAT_RATE",
  "QUOTE",
];

export const COST_RATE_TYPE_OPTIONS: CostRateType[] = [
  "FIXED_TOTAL",
  "PER_KG",
];

import type { VehicleType } from "@/app/generated/prisma/enums";

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  MOTORBIKE: "Xe máy",
  CAR: "Ô tô",
  VAN: "Xe van",
  TRUCK: "Xe tải",
};

export const VEHICLE_TYPE_OPTIONS: VehicleType[] = [
  "MOTORBIKE",
  "CAR",
  "VAN",
  "TRUCK",
];

import type { PickupStatus } from "@/app/generated/prisma/enums";

export const PICKUP_STATUS_LABEL: Record<PickupStatus, string> = {
  PENDING: "Chờ xử lý",
  ASSIGNED: "Đã phân công",
  ACCEPTED: "Tài xế đã nhận",
  ON_THE_WAY: "Đang di chuyển",
  ARRIVED: "Đã đến nơi",
  PICKED_UP: "Đã lấy hàng",
  FAILED: "Lấy hàng thất bại",
  CANCELLED: "Đã huỷ",
};

export const PICKUP_STATUS_TONE: Record<PickupStatus, BadgeTone> = {
  PENDING: "warning",
  ASSIGNED: "info",
  ACCEPTED: "info",
  ON_THE_WAY: "primary",
  ARRIVED: "primary",
  PICKED_UP: "success",
  FAILED: "destructive",
  CANCELLED: "neutral",
};

export const PICKUP_STATUS_OPTIONS: PickupStatus[] = [
  "PENDING",
  "ASSIGNED",
  "ACCEPTED",
  "ON_THE_WAY",
  "ARRIVED",
  "PICKED_UP",
  "FAILED",
  "CANCELLED",
];

import type {
  SupplyCategory,
  StockMovementType,
} from "@/app/generated/prisma/enums";

export const SUPPLY_CATEGORY_LABEL: Record<SupplyCategory, string> = {
  PACKAGING: "Đóng gói",
  LABEL: "Tem nhãn",
  OFFICE: "Văn phòng phẩm",
  EQUIPMENT: "Dụng cụ",
  OTHER: "Khác",
};

export const SUPPLY_CATEGORY_TONE: Record<SupplyCategory, BadgeTone> = {
  PACKAGING: "info",
  LABEL: "primary",
  OFFICE: "neutral",
  EQUIPMENT: "warning",
  OTHER: "neutral",
};

export const SUPPLY_CATEGORY_OPTIONS: SupplyCategory[] = [
  "PACKAGING",
  "LABEL",
  "OFFICE",
  "EQUIPMENT",
  "OTHER",
];

export const STOCK_MOVEMENT_TYPE_LABEL: Record<StockMovementType, string> = {
  IN: "Nhập kho",
  OUT: "Xuất kho",
  ADJUST: "Kiểm kê",
};

export const STOCK_MOVEMENT_TYPE_TONE: Record<StockMovementType, BadgeTone> = {
  IN: "success",
  OUT: "warning",
  ADJUST: "info",
};

import type {
  ExpenseCategory,
  ExpenseStatus,
} from "@/app/generated/prisma/enums";

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  PACKAGING_EQUIPMENT: "Thiết bị – đóng gói",
  FOOD_ENTERTAINMENT: "ăn uống, giải trí",
  OPERATIONS_WAREHOUSE: "Vận hành – kho",
  OPENING_BRANDING: "Khai trương – hình ảnh",
  OTHER: "Khác",
};

export const EXPENSE_CATEGORY_TONE: Record<ExpenseCategory, BadgeTone> = {
  PACKAGING_EQUIPMENT: "info",
  FOOD_ENTERTAINMENT: "warning",
  OPERATIONS_WAREHOUSE: "primary",
  OPENING_BRANDING: "success",
  OTHER: "neutral",
};

export const EXPENSE_CATEGORY_OPTIONS: ExpenseCategory[] = [
  "PACKAGING_EQUIPMENT",
  "FOOD_ENTERTAINMENT",
  "OPERATIONS_WAREHOUSE",
  "OPENING_BRANDING",
  "OTHER",
];

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
};

export const EXPENSE_STATUS_TONE: Record<ExpenseStatus, BadgeTone> = {
  UNPAID: "warning",
  PAID: "success",
};

export const EXPENSE_STATUS_OPTIONS: ExpenseStatus[] = ["UNPAID", "PAID"];

import type { UserRole } from "@/app/generated/prisma/enums";

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Quản trị viên",
  STAFF: "Nhân viên",
  SALE: "Nhân viên sale",
  DRIVER: "Tài xế",
};

export const USER_ROLE_TONE: Record<UserRole, BadgeTone> = {
  ADMIN: "primary",
  STAFF: "info",
  SALE: "success",
  DRIVER: "warning",
};

export const USER_ROLE_DESCRIPTION: Record<UserRole, string> = {
  ADMIN: "Toàn quyền: quản lý tài khoản, chi phí, cấu hình.",
  STAFF: "Vận hành: đơn hàng, kho, lệnh lấy hàng.",
  SALE: "Nhân viên kinh doanh: tạo đơn, xem doanh thu cá nhân.",
  DRIVER: "Tài xế giao nhận: chỉ dùng cho lệnh lấy hàng.",
};

/** Role gán tay khi tạo tài khoản (DRIVER tạo qua module Tài xế). */
export const USER_ROLE_OPTIONS: UserRole[] = ["ADMIN", "STAFF", "SALE", "DRIVER"];
