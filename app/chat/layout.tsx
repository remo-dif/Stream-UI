"use client";

import { useAuthInit } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/AppSidebar";

/**
 * ChatLayout Component
 * 
 * Provides the core layout for the chat section of the application.
 * It initializes authentication state and provides a persistent sidebar.
 */
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAuthInit();
...
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
