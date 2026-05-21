import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  ClipboardList,
  Landmark,
  LayoutDashboard,
  Package,
  PackageOpen,
  ReceiptText,
  Truck,
  UserCog,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSection = {
  label: string;
  items: NavItem[];
  /** Chỉ hiển thị cho ADMIN. */
  adminOnly?: boolean;
};

export const ADMIN_NAV: NavSection[] = [
  {
    label: "Tổng quan",
    items: [
      {
        href: "/admin/dashboard",
        label: "Bảng điều khiển",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Vận hành",
    items: [
      { href: "/admin/orders", label: "Đơn hàng", icon: ClipboardList },
      { href: "/admin/pickups", label: "Lệnh lấy hàng", icon: PackageOpen },
      { href: "/admin/packages", label: "Kiện hàng", icon: Package },
      { href: "/admin/supplies", label: "Kho vật tư", icon: Warehouse },
      { href: "/admin/drivers", label: "Tài xế", icon: Truck },
    ],
  },
  {
    label: "Khách hàng & dịch vụ",
    items: [
      { href: "/admin/customers", label: "Khách hàng", icon: Users },
      { href: "/admin/services", label: "Dịch vụ", icon: Wrench },
    ],
  },
  {
    label: "Chi phí",
    items: [
      { href: "/admin/cost-rates", label: "Bảng giá chi phí", icon: Banknote },
      { href: "/admin/cost-items", label: "Khoản chi phí", icon: ReceiptText },
      { href: "/admin/startup-expenses", label: "Chi phí thành lập", icon: Landmark },
    ],
  },
  {
    label: "Hệ thống",
    adminOnly: true,
    items: [{ href: "/admin/users", label: "Tài khoản", icon: UserCog }],
  },
];
