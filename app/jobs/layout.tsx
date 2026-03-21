"use client";

import { AppSidebar } from "@/components/AppSidebar";
import { useAuthInit } from "@/hooks/useAuth";

/**
 * JobsLayout Component
 * 
 * Provides the standard authenticated layout for the Async Jobs section.
 */
export default function JobsLayout({ children }: { children: React.ReactNode }) {
  useAuthInit();
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
