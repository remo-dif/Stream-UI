"use client";

import { useState, useCallback, KeyboardEvent } from "react";

/**
 * Since AI SDK v5, useChat no longer manages the input field internally.
 * This hook provides a controlled textarea experience that integrates
 * seamlessly with useChat's sendMessage().
 */
export function useChatInput(
  onSubmit: (text: string) => void,
  isLoading: boolean,
) {
  const [input, setInput] = useState("");

  const handleChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isLoading) return;
      onSubmit(trimmed);
      setInput("");
    },
    [input, isLoading, onSubmit],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const trimmed = input.trim();
        if (trimmed && !isLoading) {
          onSubmit(trimmed);
          setInput("");
        }
      }
    },
    [input, isLoading, onSubmit],
  );

  const clear = useCallback(() => setInput(""), []);

  return { input, handleChange, handleSubmit, handleKeyDown, clear };
}
