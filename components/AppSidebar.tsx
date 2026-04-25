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
import { authApi, chatApi } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { QuotaIndicator } from "./QuotaIndicator";
import type { Conversation } from "@/types";

interface AppSidebarProps {
  activeConversationId?: string;
}

export function AppSidebar({
  activeConversationId,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { user, token, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const loadConversations = useCallback(async () => {
    if (!token) return;
    setIsLoadingConvs(true);
    try {
      const data = await chatApi.listConversations(token);
      setConversations(data);
    } catch {
      // Silently fail to keep the shell usable during transient API issues.
    } finally {
      setIsLoadingConvs(false);
    }
  }, [token]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      if (activeConversationId === id) router.push("/chat");
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();

    try {
      if (token) {
        await authApi.signOut(token).catch(() => undefined);
      }
      await supabase.auth.signOut();
    } finally {
      logout();
      router.replace("/login");
    }
  };

  const navItems = [
    { href: "/chat", icon: MessageSquare, label: "Chat" },
    { href: "/dashboard", icon: BarChart2, label: "Usage Dashboard" },
    { href: "/jobs", icon: Briefcase, label: "Async Jobs" },
    ...(user?.role === "admin" || user?.role === "superadmin"
      ? [{ href: "/admin", icon: Users, label: "Admin" }]
      : []),
  ];

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur transition-all duration-200",
        collapsed ? "w-[78px]" : "w-72 xl:w-80",
      )}
    >
      <div className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/20">
                <Cpu className="h-4 w-4 text-sidebar-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">
                  StreamAI
                </p>
                <p className="text-xs text-sidebar-foreground/45">
                  AI workspace
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ml-auto rounded-xl p-2 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {!collapsed && (
          <p className="mt-4 rounded-2xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-xs leading-5 text-sidebar-foreground/60">
            Keep conversations, usage, and admin controls in one calm
            workspace.
          </p>
        )}
      </div>

      <div className="px-3 py-3">
        <button
          onClick={handleNewChat}
          aria-label="Start new chat"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-2xl border border-primary/15 bg-primary/12 px-3 py-3 text-sm font-medium text-sidebar-primary transition-all hover:border-primary/30 hover:bg-primary/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            collapsed && "justify-center",
          )}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      <nav className="space-y-1 px-3" aria-label="Primary navigation">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                collapsed && "justify-center",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mt-2 flex-1 overflow-y-auto px-3 pb-3">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/35">
            Conversations
          </p>
          {isLoadingConvs ? (
            <div className="space-y-2 px-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded-2xl bg-sidebar-accent animate-pulse"
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sidebar-border bg-sidebar-accent/25 px-3 py-4 text-xs leading-5 text-sidebar-foreground/45">
              No conversations yet. Start one from the button above.
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className={cn(
                    "group flex items-center justify-between rounded-2xl px-3 py-2 text-sm transition-colors",
                    activeConversationId === conv.id
                      ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                  )}
                >
                  <span className="truncate pr-2">
                    {truncate(conv.title, 34)}
                  </span>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    aria-label={`Delete conversation ${conv.title}`}
                    className="rounded-lg p-1 text-sidebar-foreground/40 opacity-0 transition-all hover:bg-sidebar-background/60 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1 border-t border-sidebar-border p-3">
        <QuotaIndicator collapsed={collapsed} />

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            collapsed && "justify-center",
          )}
        >
          {mounted && (theme === "light" ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          ))}
          {!collapsed && <span>Toggle theme</span>}
        </button>

        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            collapsed && "justify-center",
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        {user && (
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-2xl border border-sidebar-border bg-sidebar-accent/20 px-3 py-3",
              collapsed && "justify-center",
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {getInitials(user.fullName, user.email)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-sidebar-foreground">
                  {user.fullName || user.email}
                </p>
                <p className="text-xs text-sidebar-foreground/40 capitalize">
                  {user.role}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                aria-label="Log out"
                className="rounded-xl p-2 text-sidebar-foreground/40 transition-colors hover:bg-sidebar-background/60 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
