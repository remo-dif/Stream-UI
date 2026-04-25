"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { chatApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useRequireAuth } from "@/hooks/useAuth";

/**
 * ChatIndexPage Component
 * 
 * The default view when entering the /chat route without a specific conversation.
 * It provides a welcome message and a quick action to start a new chat.
 * 
 * Key Features:
 * 1. Auth Integration: Uses useRequireAuth to ensure only logged-in users can see the page.
 * 2. New Chat Initiation: Handles conversation creation via the chatApi and redirects to the new session.
 */
export default function ChatIndexPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const { token } = useAuthStore();
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  // Create a new conversation and navigate to its dedicated page
  const handleNewChat = async () => {
    if (!token) return;
    setIsCreating(true);
    try {
      const conv = await chatApi.createConversation("New conversation", token);
      router.push(`/chat/${conv.id}`);
    } catch {
      toast.error("Could not start a new chat");
      setIsCreating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <section className="page-shell flex h-full items-center justify-center">
      <div className="surface-panel mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-12 text-center sm:px-10 sm:py-16">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-primary/10 text-primary">
          <MessageSquare className="h-8 w-8" />
        </div>
        <span className="mb-3 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Chat workspace
        </span>
        <h1 className="mb-2 text-3xl font-semibold">
          Welcome back{user?.fullName ? `, ${user.fullName}` : ""}
        </h1>
        <p className="mb-8 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
          Pick up an earlier conversation from the sidebar or open a fresh one
          to draft, explore, and iterate quickly.
        </p>
        <button
          onClick={handleNewChat}
          disabled={isCreating}
          className="ui-button-primary px-5 py-3"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          Start New Chat
        </button>
      </div>
    </section>
  );
}
