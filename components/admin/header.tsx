"use client";

import * as React from "react";
import { Bell, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/admin/user-menu";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/app/generated/prisma/enums";

export interface AdminHeaderProps {
  onOpenSidebar?: () => void;
  className?: string;
  user?: { name: string; email: string; role: UserRole } | null;
}

export function AdminHeader({ onOpenSidebar, className, user }: AdminHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSidebar}
        className="md:hidden"
        aria-label="Mở menu điều hướng"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </Button>

      <div className="relative hidden flex-1 max-w-md md:block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Tìm đơn hàng, khách hàng, kiện hàng…"
          className="pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Thông báo">
          <Bell className="h-5 w-5" aria-hidden />
        </Button>
        <UserMenu user={user ?? null} />
      </div>
    </header>
  );
}
