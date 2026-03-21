"use client";

import { AppSidebar } from "@/components/AppSidebar";
import { useAuthInit } from "@/hooks/useAuth";
/**
 * DashboardLayout Component
 * 
 * Provides a standardized layout for all dashboard pages, 
 * including the shared AppSidebar.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAuthInit();
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
...
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
