"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { USER_ROLE_LABEL } from "@/lib/enum-labels";
import type { UserRole } from "@/app/generated/prisma/enums";

export interface UserMenuProps {
  user: { name: string; email: string; role: UserRole } | null;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name.trim().slice(0, 2) || "EZ").toUpperCase();
}

export function UserMenu({ user }: UserMenuProps) {
  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1 pr-3">
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        >
          {initialsOf(user.name)}
        </span>
        <div className="hidden text-left leading-tight sm:block">
          <p className="text-sm font-medium text-foreground">{user.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {USER_ROLE_LABEL[user.role]}
          </p>
        </div>
      </div>
      <form action={logout}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Đăng xuất"
          title="Đăng xuất"
        >
          <LogOut className="h-5 w-5" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
