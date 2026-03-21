"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { chatApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useRequireAuth } from "@/hooks/useAuth";

interface Params {
  conversationId: string;
}

/**
 * ConversationPage Component
 * 
 * The dynamic route handler for specific chat conversations.
 * It manages the conversation's metadata (like title) and initializes the ChatWindow.
 * 
 * Key Logic:
 * 1. Parameter Unwrapping: Uses React's `use()` hook to access the conversationId from the URL.
 * 2. Metadata Synchronization: Fetches the latest conversation details on mount to sync the header title.
 * 3. Actions: Provides a header-level interface for deleting the entire conversation.
 * 
 * Props:
 * @param {Params} params - Next.js dynamic route parameters containing the conversationId.
 */
export default function ConversationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { conversationId } = use(params);
  const { user, isLoading: authLoading } = useRequireAuth();
  const { token } = useAuthStore();
  const router = useRouter();

  const [title, setTitle] = useState("New Conversation");
  const [isLoadingConv, setIsLoadingConv] = useState(true);

  // Load conversation metadata from the backend
  useEffect(() => {
    if (!token || !conversationId) return;

    const load = async () => {
      setIsLoadingConv(true);
      try {
        const conv = await chatApi.getConversation(conversationId, token);
        setTitle(conv.title);
      } catch {
        // For new conversations, the title will be automatically updated via ChatWindow's internal logic
      } finally {
        setIsLoadingConv(false);
      }
    };

    load();
  }, [conversationId, token]);

  const handleDelete = async () => {
    if (!token) return;
    if (!confirm("Delete this conversation?")) return;
    try {
      await chatApi.deleteConversation(conversationId, token);
      toast.success("Conversation deleted");
      router.push("/chat");
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (authLoading || isLoadingConv) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-semibold text-sm truncate">{title}</h1>
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
            {conversationId.slice(0, 8)}…
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Chat window */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          conversationId={conversationId}
          initialTitle={title}
          onTitleChange={setTitle}
        />
      </div>
    </div>
  );
}
