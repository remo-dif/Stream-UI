"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ChatErrorBanner } from "./ChatErrorBanner";
import { useChatInput } from "@/hooks/useChatInput";
import { useAuthStore } from "@/lib/store";
import type { TokenUsageMetadata } from "@/types";

interface ChatWindowProps {
  conversationId: string;
  initialTitle?: string;
  onTitleChange?: (title: string) => void;
}

/**
 * ChatWindow Component
 * 
 * The primary interface for real-time conversation. It leverages AI SDK v5 
 * to handle streaming, state management, and error recovery.
 * 
 * Key Logic:
 * 1. AI SDK v5 Transport: Custom fetch logic to handle token injection and specialized 402 errors.
 * 2. Input Control: Decoupled input state managed via useChatInput.
 * 3. Auto-scroll: Monitors message length to keep the viewport at the bottom.
 * 4. Title Generation: Triggers a title update on the first user message.
 * 
 * Props:
 * @param {string} conversationId - Unique identifier for the current chat session.
 * @param {string} initialTitle - The existing title of the conversation, if any.
 * @param {(title: string) => void} onTitleChange - Callback to update the conversation title in the parent/sidebar.
 */
export function ChatWindow({
  conversationId,
  initialTitle,
  onTitleChange,
}: ChatWindowProps) {
  const { token, user } = useAuthStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageMetadata | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // ─── AI SDK v5 Stream Configuration ────────────────────────────────────────

  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    regenerate,
    clearError,
  } = useChat({
    id: conversationId,

    /**
     * Transport Layer:
     * In AI SDK v5, DefaultChatTransport abstracts the HTTP request.
     * We use it here to dynamically inject the latest Bearer token
     * and tenant metadata without polluting the main hook state.
     */
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: () => ({
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }),
      body: () => ({
        conversationId,
        data: { userId: user?.id, tenantId: user?.tenantId },
      }),
      // Custom fetch interceptor for error handling before the stream starts
      fetch: async (url, init) => {
        const res = await fetch(url, init);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          // Specialized 402 handling: if the backend reports payment required, we disable input
          if (res.status === 402) setQuotaExceeded(true);
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        return res;
      },
    }),

    // Captured when the stream finishes successfully
    onFinish(options) {
      // Extract custom metadata (token usage) injected by our backend
      const meta = options.message.metadata as TokenUsageMetadata | undefined;
      if (meta?.totalTokens) setTokenUsage(meta);
    },

    // Global error handler for the stream
    onError(err) {
      // Check for quota-related errors to update local UI state
      if (err.message?.includes("quota") || err.message?.includes("402")) {
        setQuotaExceeded(true);
      }
      toast.error("Stream error", { description: err.message });
    },
  });

  const isStreaming = status === "streaming";
  const isSubmitted = status === "submitted";
  const isLoading = isStreaming || isSubmitted;

  // ── Controlled input via hook (AI SDK v5 no longer owns input state) ────────
  // We decouple input management to allow for better control over form events and local state
  const { input, handleChange, handleSubmit, handleKeyDown, clear } =
    useChatInput((text) => {
      clearError();
      sendMessage({ text });
    }, isLoading);

  // Auto-scroll to bottom whenever messages change or loading state toggles
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-generate conversation title from the first user message if no title exists
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "user" && onTitleChange) {
      const text = messages[0].parts
        .filter((p) => p.type === "text")
        .map((p) => (p as { type: "text"; text: string }).text)
        .join("")
        .slice(0, 60);
      onTitleChange(text);
    }
  }, [messages, onTitleChange]);

  const handleRegenerate = useCallback(() => {
    clearError();
    regenerate();
  }, [regenerate, clearError]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── Messages area ───────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 scroll-smooth"
      >
        {isEmpty ? (
          <EmptyState
            onSuggestion={(text) => {
              clearError();
              sendMessage({ text });
            }}
          />
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isLast={i === messages.length - 1}
                isStreaming={isStreaming && i === messages.length - 1}
                tokenUsage={i === messages.length - 1 ? tokenUsage : null}
                onRegenerate={
                  msg.role === "assistant" ? handleRegenerate : undefined
                }
              />
            ))}

            {/* Typing indicator: request in-flight but no token yet */}
            {isSubmitted && <TypingIndicator />}
          </div>
        )}
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      <ChatErrorBanner
        error={error}
        onRetry={handleRegenerate}
        onDismiss={clearError}
      />

      {/* ── Input ───────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto w-full">
        <ChatInput
          input={input}
          isLoading={isLoading}
          isDisabled={quotaExceeded}
          disabledReason={
            quotaExceeded
              ? "Token quota exceeded. Upgrade your plan to continue chatting."
              : undefined
          }
          onInputChange={handleChange}
          onSubmit={handleSubmit}
          onStop={stop}
        />
      </div>
    </div>
  );
}

// ─── Empty state with suggestions ────────────────────────────────────────────

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  const suggestions = [
    "Summarize the key benefits of microservices architecture",
    "Write a TypeScript function to debounce API calls",
    "Explain the difference between SSE and WebSockets",
    "Help me design a Redis caching strategy for a NestJS app",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <MessageSquare className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-xl font-semibold mb-1">How can I help you?</h2>
      <p className="text-muted-foreground text-sm mb-8">
        Start a conversation or pick a suggestion below
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="p-3 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 text-left text-sm text-muted-foreground hover:text-foreground transition-all duration-150"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

