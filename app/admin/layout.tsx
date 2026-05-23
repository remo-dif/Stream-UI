"use client";

import { AppShell } from "@/components/AppShell";
import { useAuthInit } from "@/hooks/useAuth";

/**
 * AdminLayout Component
 * 
 * A specialized layout for admin-only pages. It ensures authentication 
 * is initialized and wraps children with the AppSidebar.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useAuthInit();

  return <AppShell title="Admin">{children}</AppShell>;
}
