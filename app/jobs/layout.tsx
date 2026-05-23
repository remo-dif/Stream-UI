"use client";

import { AppShell } from "@/components/AppShell";
import { useAuthInit } from "@/hooks/useAuth";

/**
 * JobsLayout Component
 * 
 * Provides the standard authenticated layout for the Async Jobs section.
 */
export default function JobsLayout({ children }: { children: React.ReactNode }) {
  useAuthInit();

  return <AppShell title="Async Jobs">{children}</AppShell>;
}
