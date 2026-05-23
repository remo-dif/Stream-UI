"use client";

import { AppShell } from "@/components/AppShell";
import { useAuthInit } from "@/hooks/useAuth";

/**
 * SettingsLayout Component
 * 
 * Standard authenticated layout for user and tenant settings.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  useAuthInit();

  return <AppShell title="Settings">{children}</AppShell>;
}
