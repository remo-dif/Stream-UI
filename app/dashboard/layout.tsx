"use client";

import { AppShell } from "@/components/AppShell";
import { useAuthInit } from "@/hooks/useAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAuthInit();

  return <AppShell title="Usage Dashboard">{children}</AppShell>;
}
