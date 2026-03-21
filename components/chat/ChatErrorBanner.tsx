"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatErrorBannerProps {
  error: Error | undefined;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * ChatErrorBanner Component
 * 
 * Displays a contextual error message at the bottom of the chat window.
 * It handles different types of errors (Rate Limit, Quota Exceeded, General)
 * and provides retry/dismiss actions.
 * 
 * Key Features:
 * 1. Rate Limit Handling: Detects 429 errors and starts a countdown timer for retry.
 * 2. Quota Awareness: Identifies 402/Quota errors to suggest plan upgrades.
 * 3. Adaptive Styling: Changes its visual variant (error, warning, info) based on the error type.
 * 
 * Props:
 * @param {Error | undefined} error - The error object to display.
 * @param {() => void} onRetry - Optional callback to trigger a retry of the last action.
 * @param {() => void} onDismiss - Optional callback to clear the error state.
 */
export function ChatErrorBanner({
  error,
  onRetry,
  onDismiss,
}: ChatErrorBannerProps) {
  const [countdown, setCountdown] = useState<number | null>(null);

  // Effect to analyze error and setup rate-limit countdowns
  useEffect(() => {
    if (!error) return;

    // Check for rate-limit error with retryAfter
    const msg = error.message || "";
    const isRateLimit =
      msg.toLowerCase().includes("rate limit") ||
      msg.includes("429");

    if (isRateLimit) {
      // Try to extract retryAfter from error, default to 30s
      const match = msg.match(/retryAfter[:\s]+(\d+)/i);
      const seconds = match ? parseInt(match[1]) : 30;
      setCountdown(seconds);
    } else {
      setCountdown(null);
    }
  }, [error]);

  // Handle the active countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c === null || c <= 1) {
          clearInterval(interval);
          return null;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  if (!error) return null;

  const isRateLimit = countdown !== null || error.message?.includes("rate limit");
  const isQuota = error.message?.includes("quota") || error.message?.includes("402");

  let title = "Something went wrong";
  let description = error.message || "An unexpected error occurred. Please try again.";
  let variant: "error" | "warning" | "info" = "error";

  if (isRateLimit) {
    title = "Rate limit reached";
    description = countdown
      ? `Too many requests. Retrying in ${countdown}s…`
      : "Too many requests. Please wait a moment before trying again.";
    variant = "warning";
  } else if (isQuota) {
    title = "Token quota exceeded";
    description = "You've used all your tokens for this period. Please upgrade your plan.";
    variant = "info";
  }

  return (
    <div
      className={cn(
        "mx-4 mb-2 flex items-start gap-3 rounded-xl border p-3 text-sm animate-fade-in",
        variant === "error" && "bg-destructive/10 border-destructive/20 text-destructive",
        variant === "warning" && "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400",
        variant === "info" && "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
      )}
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{title}</p>
        <p className="opacity-80 text-xs mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {onRetry && !countdown && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-xs font-medium"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
