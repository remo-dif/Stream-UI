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
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <MessageSquare className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold mb-2">
        Welcome back{user?.fullName ? `, ${user.fullName}` : ""}
      </h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Select a conversation from the sidebar or start a new one.
      </p>
      <button
        onClick={handleNewChat}
        disabled={isCreating}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {isCreating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MessageSquare className="w-4 h-4" />
        )}
        Start New Chat
      </button>
    </div>
  );
}
