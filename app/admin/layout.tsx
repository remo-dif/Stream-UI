"use client";

import { AppSidebar } from "@/components/AppSidebar";
import { useAuthInit } from "@/hooks/useAuth";

/**
 * AdminLayout Component
 * 
 * A specialized layout for admin-only pages. It ensures authentication 
 * is initialized and wraps children with the AppSidebar.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useAuthInit();
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
