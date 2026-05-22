"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package2 } from "lucide-react";
import { ADMIN_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/app/generated/prisma/enums";

function isActive(pathname: string, href: string) {
  if (href === pathname) return true;
  return pathname.startsWith(`${href}/`);
}

export interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  role?: UserRole;
}

export function Sidebar({ className, onNavigate, role }: SidebarProps) {
  const pathname = usePathname() ?? "";
  const sections = ADMIN_NAV.filter(
    (section) => !section.adminOnly || role === "ADMIN"
  )
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          !item.roles || (role !== undefined && item.roles.includes(role))
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Package2 className="h-4 w-4" aria-hidden />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">
            EZWAY Ops
          </span>
          <span className="text-[11px] text-sidebar-foreground/60">
            Quản trị vận hành
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-6">
          {sections.map((section) => (
            <li key={section.label}>
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {section.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-5 py-3 text-[11px] text-sidebar-foreground/60">
        v2 · Phiên bản nội bộ
      </div>
    </aside>
  );
}
