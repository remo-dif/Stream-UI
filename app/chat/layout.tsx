"use client";

import { useAuthInit } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/AppSidebar";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const activeConversationId = pathname.startsWith("/chat/")
    ? pathname.split("/")[2]
    : undefined;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar activeConversationId={activeConversationId} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
