"use client";

import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { cn, formatTokens } from "@/lib/utils";
import type { TokenUsageMetadata } from "@/types";

interface TokenBadgeProps {
  usage?: TokenUsageMetadata | null;
  isStreaming?: boolean;
  className?: string;
}

/**
 * TokenBadge Component
 * 
 * A small badge that displays token usage statistics (prompt + completion).
 * It uses a subtle pulse animation during streaming and a pop animation on update.
 * 
 * Key Logic:
 * 1. Update Animation: Tracks the total token count and triggers a CSS animation when it changes.
 * 2. Streaming State: Shows a generic "Streaming..." message when data is still being generated.
 * 3. Token Breakdown: Displays total tokens with an optional breakdown of prompt vs completion.
 * 
 * Props:
 * @param {TokenUsageMetadata} usage - The token metadata from the AI response.
 * @param {boolean} isStreaming - Whether the message is still being streamed.
 * @param {string} className - Optional additional CSS classes.
 */
export function TokenBadge({ usage, isStreaming, className }: TokenBadgeProps) {
  const [animated, setAnimated] = useState(false);
  const prevTotal = useRef<number>(0);

  // Trigger a brief animation when token counts update
  useEffect(() => {
    if (usage && usage.totalTokens !== prevTotal.current) {
      prevTotal.current = usage.totalTokens;
      setAnimated(true);
      const t = setTimeout(() => setAnimated(false), 300);
      return () => clearTimeout(t);
    }
  }, [usage]);

  if (!usage && !isStreaming) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border transition-colors",
        isStreaming
          ? "border-primary/30 bg-primary/10 text-primary animate-pulse"
          : "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      <Zap className="w-3 h-3" />
      {isStreaming && !usage ? (
        <span>Streaming…</span>
      ) : usage ? (
        <span className={cn(animated && "token-badge-update")}>
          {formatTokens(usage.totalTokens)} tokens
          {usage.promptTokens > 0 && (
            <span className="opacity-60 ml-1">
              ({formatTokens(usage.promptTokens)}↑{" "}
              {formatTokens(usage.completionTokens)}↓)
            </span>
          )}
        </span>
      ) : null}
    </div>
  );
}
