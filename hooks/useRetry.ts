"use client";

import { useState, useCallback, useRef } from "react";

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

interface RetryState {
  attempt: number;
  isRetrying: boolean;
  nextRetryMs: number | null;
  error: Error | null;
}

/**
 * Wraps any async function with exponential backoff retry logic.
 *
 * Usage:
 *   const { execute, state, reset } = useRetry(myApiCall, { maxAttempts: 3 });
 *   await execute(arg1, arg2);
 */
export function useRetry<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {},
) {
  const { maxAttempts = 3, baseDelayMs = 500, onRetry } = options;

  const [state, setState] = useState<RetryState>({
    attempt: 0,
    isRetrying: false,
    nextRetryMs: null,
    error: null,
  });

  const abortRef = useRef(false);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      abortRef.current = false;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        setState({ attempt, isRetrying: attempt > 1, nextRetryMs: null, error: null });

        try {
          const result = await fn(...args);
          setState({ attempt, isRetrying: false, nextRetryMs: null, error: null });
          return result;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));

          if (abortRef.current) return null;

          // Don't retry on client errors (4xx except 429)
          const is4xx =
            error.message.includes("HTTP 4") &&
            !error.message.includes("HTTP 429");
          if (is4xx || attempt === maxAttempts) {
            setState({ attempt, isRetrying: false, nextRetryMs: null, error });
            throw error;
          }

          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          onRetry?.(attempt, error);

          // Count down to next retry
          setState({ attempt, isRetrying: true, nextRetryMs: delay, error });
          await new Promise((r) => setTimeout(r, delay));

          if (abortRef.current) return null;
        }
      }

      return null;
    },
    [fn, maxAttempts, baseDelayMs, onRetry],
  );

  const reset = useCallback(() => {
    abortRef.current = true;
    setState({ attempt: 0, isRetrying: false, nextRetryMs: null, error: null });
  }, []);

  return { execute, state, reset };
}
