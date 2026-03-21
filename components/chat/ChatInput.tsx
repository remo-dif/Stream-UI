"use client";

import { useRef, useEffect, KeyboardEvent } from "react";
import { Send, Square, Paperclip, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  isDisabled?: boolean;
  disabledReason?: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
}

/**
 * ChatInput Component
 * 
 * A specialized multi-line textarea for sending messages to the AI.
 * It features auto-resizing, keyboard shortcuts, and state-aware buttons.
 * 
 * Key Logic:
 * 1. Auto-resize: Dynamically adjusts textarea height based on content up to a max-height.
 * 2. Keyboard Control: Supports 'Enter' to submit and 'Shift+Enter' for new lines.
 * 3. Loading/Disabled States: Toggles between 'Send' and 'Stop' buttons during generation.
 * 
 * Props:
 * @param {string} input - Current text input value.
 * @param {boolean} isLoading - Whether the AI is currently generating a response.
 * @param {boolean} isDisabled - Whether the input should be globally disabled (e.g., quota exceeded).
 * @param {string} disabledReason - Optional text to show when the input is disabled.
 * @param {(value: string) => void} onInputChange - Callback for text changes.
 * @param {(e: React.FormEvent) => void} onSubmit - Callback for form submission.
 * @param {() => void} onStop - Callback to stop the current generation.
 */
export function ChatInput({
  input,
  isLoading,
  isDisabled,
  disabledReason,
  onInputChange,
  onSubmit,
  onStop,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height based on content
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [input]);

  // Handle submission on Enter (without Shift)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim() && !isDisabled) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  const placeholders = [
    "Ask anything… (Shift+Enter for newline)",
    "What would you like to know?",
    "Start a conversation…",
  ];
  const placeholder = placeholders[0];

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-sm p-4">
      {disabledReason && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {disabledReason}
        </div>
      )}

      <form onSubmit={onSubmit} className="relative">
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border bg-card px-3 py-2 shadow-sm transition-colors",
            isDisabled
              ? "border-border opacity-60"
              : "border-border focus-within:border-primary/50 focus-within:shadow-md focus-within:shadow-primary/5",
          )}
        >
          {/* Paperclip placeholder */}
          <button
            type="button"
            disabled
            className="p-1.5 text-muted-foreground/40 cursor-not-allowed mb-0.5"
            title="File upload (coming soon)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none min-h-[36px] max-h-[180px] py-2 leading-relaxed"
          />

          {/* Send / Stop */}
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="p-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors mb-0.5 shrink-0"
              title="Stop generation"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || isDisabled}
              className={cn(
                "p-2 rounded-xl transition-all mb-0.5 shrink-0",
                input.trim() && !isDisabled
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
              )}
              title="Send (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Hint */}
        <div className="flex items-center justify-between mt-1.5 px-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground/40">
            <Sparkles className="w-3 h-3" />
            <span>Powered by Claude via Stream-API</span>
          </div>
          <span className="text-xs text-muted-foreground/30">
            {input.length > 0 && `${input.length} chars`}
          </span>
        </div>
      </form>
    </div>
  );
}
