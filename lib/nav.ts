import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BarChart3,
  ClipboardList,
  FileText,
  Landmark,
  LayoutDashboard,
  Megaphone,
  PackageOpen,
  ReceiptText,
  Send,
  TrendingUp,
  Truck,
  UserCog,
  UserPlus,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";
import type { UserRole } from "@/app/generated/prisma/enums";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Nếu đặt — chỉ các role này thấy mục. Bỏ trống = mọi role thấy. */
  roles?: UserRole[];
};

export type NavSection = {
  label: string;
  items: NavItem[];
  /** Chỉ hiển thị cho ADMIN. */
  adminOnly?: boolean;
};

const OPS: UserRole[] = ["ADMIN", "STAFF"];

export const ADMIN_NAV: NavSection[] = [
  {
    label: "Tổng quan",
    items: [
      {
        href: "/admin/dashboard",
        label: "Bảng điều khiển",
        icon: LayoutDashboard,
        roles: OPS,
      },
      {
        href: "/admin/my-sales",
        label: "Bán hàng của tôi",
        icon: TrendingUp,
        roles: ["SALE"],
      },
      {
        href: "/admin/announcements",
        label: "Thông báo",
        icon: Megaphone,
      },
    ],
  },
  {
    label: "Vận hành",
    items: [
      { href: "/admin/orders", label: "Đơn hàng", icon: ClipboardList },
      {
        href: "/admin/processing",
        label: "Đẩy carrier",
        icon: Send,
        roles: OPS,
      },
      {
        href: "/admin/pickups",
        label: "Lệnh lấy hàng",
        icon: PackageOpen,
        roles: ["ADMIN", "STAFF", "SALE"],
      },
      { href: "/admin/supplies", label: "Kho vật tư", icon: Warehouse, roles: OPS },
      { href: "/admin/drivers", label: "Tài xế", icon: Truck, roles: OPS },
      { href: "/admin/invoices", label: "Hoá đơn điện tử", icon: FileText, roles: OPS },
    ],
  },
  {
    label: "Khách hàng & dịch vụ",
    items: [
      { href: "/admin/customers", label: "Khách hàng", icon: Users },
      { href: "/admin/services", label: "Dịch vụ", icon: Wrench, roles: OPS },
    ],
  },
  {
    label: "Chi phí",
    items: [
      { href: "/admin/cost-rates", label: "Bảng giá chi phí", icon: Banknote, roles: OPS },
      { href: "/admin/cost-items", label: "Khoản chi phí", icon: ReceiptText, roles: OPS },
      { href: "/admin/startup-expenses", label: "Chi phí thành lập", icon: Landmark, roles: OPS },
    ],
  },
  {
    label: "Hệ thống",
    adminOnly: true,
    items: [
      { href: "/admin/sales", label: "Thống kê sale", icon: BarChart3 },
      { href: "/admin/users", label: "Tài khoản", icon: UserCog },
      { href: "/admin/pending-invites", label: "Yêu cầu cấp quyền", icon: UserPlus },
    ],
  },
];
