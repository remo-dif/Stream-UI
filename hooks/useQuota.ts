"use client";

import { useEffect, useState, useCallback } from "react";
import { usageApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { UsageSummary } from "@/types";

type QuotaStatus = "ok" | "warning" | "critical" | "exceeded";

function getQuotaStatus(pct: number): QuotaStatus {
  if (pct >= 100) return "exceeded";
  if (pct >= 90) return "critical";
  if (pct >= 75) return "warning";
  return "ok";
}

/**
 * Fetches and caches quota usage. Re-fetches every `intervalMs`.
 * Exposes the % used, status label, and a manual refresh fn.
 */
export function useQuota(intervalMs = 60_000) {
  const { token } = useAuthStore();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const data = await usageApi.summary(token);
      setSummary(data);
    } catch {
      // silently fail; stale data is OK
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  const pct = summary?.quotaUsedPercent ?? 0;

  return {
    summary,
    isLoading,
    refresh,
    pct,
    status: getQuotaStatus(pct),
    isExceeded: pct >= 100,
    isWarning: pct >= 75,
  };
}
