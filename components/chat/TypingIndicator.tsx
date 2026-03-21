"use client";

/**
 * TypingIndicator Component
 * 
 * A simple animated indicator shown when the AI has been prompted 
 * but has not yet started streaming tokens back.
 */
export function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 px-4 py-3 animate-fade-in">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
        AI
      </div>
      {/* Dots */}
      <div className="flex items-center gap-1 px-3 py-2.5 bg-card border border-border rounded-2xl rounded-bl-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block"
            style={{
              animation: "typing-dot 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
