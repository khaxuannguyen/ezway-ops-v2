"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Sidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/app/generated/prisma/enums";

export interface AdminShellUser {
  name: string;
  email: string;
  role: UserRole;
}

export function AdminShell({
  children,
  user,
  announcementUnread = 0,
}: {
  children: React.ReactNode;
  user?: AdminShellUser | null;
  announcementUnread?: number;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const closeMobile = React.useCallback(() => setMobileOpen(false), []);
  const role = user?.role;
  const badges: Record<string, number> = {
    "/admin/announcements": announcementUnread,
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <div className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-30">
        <Sidebar role={role} badges={badges} />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeMobile}
            aria-hidden
          />
          <div className="relative z-10 flex h-full w-72 max-w-[80%]">
            <Sidebar
              className="w-full"
              onNavigate={closeMobile}
              role={role}
              badges={badges}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMobile}
              aria-label="Đóng menu điều hướng"
              className="absolute -right-12 top-2 text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}

      <div className={cn("flex min-h-screen w-full flex-col md:pl-64")}>
        <AdminHeader onOpenSidebar={() => setMobileOpen(true)} user={user} />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
