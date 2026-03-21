"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * GlobalError Component
 * 
 * A top-level error boundary for the entire application. It catches unhandled 
 * errors in the Next.js App Router and provides a fallback UI.
 * 
 * Key Logic:
 * 1. Error Logging: Uses a useEffect to log errors to the console (or a monitoring service).
 * 2. Recovery: Provides a 'Try again' button that triggers the reset function.
 * 3. Layout: Since it's a global error boundary, it must define its own <html> and <body> tags.
 * 
 * Props:
 * @param {Error & { digest?: string }} error - The error object caught by the boundary.
 * @param {() => void} reset - Function to attempt to re-render the segment.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your monitoring service (Datadog, Sentry, etc.)
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html>
      <body className="bg-background text-foreground flex items-center justify-center min-h-screen">
        <div className="text-center px-6 max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground text-sm mb-6">
            An unexpected error occurred. Our team has been notified.
            {error.digest && (
              <span className="block mt-1 font-mono text-xs opacity-50">
                {error.digest}
              </span>
            )}
          </p>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
