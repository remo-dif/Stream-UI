"use client";

import { AppSidebar } from "@/components/AppSidebar";
import { useAuthInit } from "@/hooks/useAuth";

/**
 * SettingsLayout Component
 * 
 * Standard authenticated layout for user and tenant settings.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  useAuthInit();
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
