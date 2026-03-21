"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  Plus,
  Settings,
  BarChart2,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Cpu,
  Briefcase,
  Trash2,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn, truncate, getInitials } from "@/lib/utils";
import { chatApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { QuotaIndicator } from "./QuotaIndicator";
import type { Conversation } from "@/types";

interface AppSidebarProps {
  activeConversationId?: string;
}

/**
 * AppSidebar Component
 * 
 * The main navigation sidebar for the application. It manages the conversation list,
 * navigation links, and user-specific actions like logout and theme toggling.
 * 
 * Key Features:
 * 1. Conversation Management: Fetches, creates, and deletes conversations using the chatApi.
 * 2. Responsive Design: Supports a collapsed state for better space utilization.
 * 3. Dynamic Navigation: Renders navigation items based on the user's role (e.g., Admin link).
 * 4. User Integration: Displays user initials and provides logout functionality via Zustand store.
 * 
 * Props:
 * @param {string} activeConversationId - The ID of the currently active conversation for highlighting.
 * @param {(id: string) => void} onConversationSelect - Callback triggered when a conversation is selected.
 */
export function AppSidebar({
  activeConversationId,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const { user, token, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    if (!token) return;
    setIsLoadingConvs(true);
    try {
      const data = await chatApi.listConversations(token);
      setConversations(data);
    } catch {
      // silently fail – conversations may be empty
    } finally {
      setIsLoadingConvs(false);
    }
  }, [token]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleNewChat = async () => {
    if (!token) return;
    try {
      const conv = await chatApi.createConversation("New conversation", token);
      setConversations((prev) => [conv, ...prev]);
      router.push(`/chat/${conv.id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
  };

  const handleDeleteConversation = async (
    e: React.MouseEvent,
    id: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return;
    try {
      await chatApi.deleteConversation(id, token);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      // Redirect if the deleted conversation was the active one
      if (activeConversationId === id) router.push("/chat");
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  const navItems = [
    { href: "/chat", icon: MessageSquare, label: "Chat", exact: false },
    { href: "/dashboard", icon: BarChart2, label: "Usage Dashboard" },
    { href: "/jobs", icon: Briefcase, label: "Async Jobs" },
    // Only show Admin link if user has the admin role
    ...(user?.role === "admin"
      ? [{ href: "/admin", icon: Users, label: "Admin" }]
      : []),
  ];

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Cpu className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground text-sm">
              StreamAI
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors ml-auto"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* New chat button */}
      <div className="px-2 py-2">
        <button
          onClick={handleNewChat}
          className={cn(
            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-sidebar-primary transition-colors text-sm font-medium",
            collapsed && "justify-center",
          )}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Nav items */}
      <nav className="px-2 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                collapsed && "justify-center",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Conversations list */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-2 py-2 mt-2">
          <p className="text-xs font-medium text-sidebar-foreground/40 px-2.5 mb-1.5 uppercase tracking-wider">
            Conversations
          </p>
          {isLoadingConvs ? (
            <div className="space-y-1.5 px-2.5">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-7 rounded bg-sidebar-accent animate-pulse"
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-sidebar-foreground/40 px-2.5 py-2">
              No conversations yet
            </p>
          ) : (
            <div className="space-y-0.5">
              {conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className={cn(
                    "group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                    activeConversationId === conv.id
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
                  )}
                >
                  <span className="truncate">{truncate(conv.title, 30)}</span>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        {/* Quota indicator */}
        <QuotaIndicator collapsed={collapsed} />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={cn(
            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors",
            collapsed && "justify-center",
          )}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 shrink-0" />
          )}
          {!collapsed && <span>Toggle theme</span>}
        </button>

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors",
            collapsed && "justify-center",
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        {/* User */}
        {user && (
          <div
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2",
              collapsed && "justify-center",
            )}
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              {getInitials(user.fullName, user.email)}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">
                  {user.fullName || user.email}
                </p>
                <p className="text-xs text-sidebar-foreground/40 capitalize">
                  {user.role}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={logout}
                className="p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/40 hover:text-destructive transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
