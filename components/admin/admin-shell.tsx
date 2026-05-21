"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Sidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const closeMobile = React.useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <div className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-30">
        <Sidebar />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeMobile}
            aria-hidden
          />
          <div className="relative z-10 flex h-full w-72 max-w-[80%]">
            <Sidebar className="w-full" onNavigate={closeMobile} />
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
        <AdminHeader onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
