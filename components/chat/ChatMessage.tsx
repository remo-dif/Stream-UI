"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, RefreshCw, User } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import { TokenBadge } from "./TokenBadge";
import type { TokenUsageMetadata } from "@/types";
import type { UIMessage } from "@ai-sdk/react";

interface ChatMessageProps {
  message: UIMessage;
  isLast?: boolean;
  isStreaming?: boolean;
  tokenUsage?: TokenUsageMetadata | null;
  onRegenerate?: () => void;
}

/**
 * ChatMessage Component
 * 
 * Individual message bubble that supports both User and Assistant roles.
 * It handles markdown rendering for AI responses and displays token usage metadata.
 * 
 * Key Features:
 * 1. Markdown Support: Uses react-markdown with GFM and SyntaxHighlighter for code blocks.
 * 2. Role-based UI: Distinct styling and alignment for User vs. AI messages.
 * 3. Interaction: Copy-to-clipboard functionality and regeneration support for assistant messages.
 * 4. Token Visibility: Integrates the TokenBadge to show usage data for the latest AI message.
 * 
 * Props:
 * @param {UIMessage} message - The AI SDK message object.
 * @param {boolean} isLast - Whether this is the most recent message in the thread.
 * @param {boolean} isStreaming - Whether this message is currently being generated.
 * @param {TokenUsageMetadata} tokenUsage - Metadata about tokens consumed by this message.
 * @param {() => void} onRegenerate - Callback to trigger a regeneration of this message.
 */
export function ChatMessage({
  message,
  isLast,
  isStreaming,
  tokenUsage,
  onRegenerate,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  // Flatten text parts from the message (AI SDK v5 structure)
  const textContent = message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(textContent);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group flex items-end gap-3 px-4 py-2 animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mb-1",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-primary/20 text-primary",
        )}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : "AI"}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "flex flex-col gap-1.5 max-w-[78%]",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-card border border-border rounded-bl-sm",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{textContent}</p>
          ) : (
            <div className="chat-prose">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const isBlock = match !== null;
                    return isBlock ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: "0.5rem",
                          fontSize: "0.8rem",
                        }}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {textContent}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Meta: token usage + actions */}
        <div
          className={cn(
            "flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity",
            isUser ? "flex-row-reverse" : "flex-row",
          )}
        >
          {/* Token badge on assistant messages */}
          {!isUser && (
            <TokenBadge
              usage={isLast ? tokenUsage : undefined}
              isStreaming={isLast && isStreaming}
            />
          )}

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Copy"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Regenerate on last assistant message */}
          {!isUser && isLast && !isStreaming && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Regenerate"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
