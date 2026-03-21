"use client";

import Link from "next/link";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { cn, formatTokens } from "@/lib/utils";
import { useQuota } from "@/hooks/useQuota";

/**
 * QuotaIndicator Component
 * 
 * A compact visual indicator for the user's token usage quota. 
 * It displays a progress bar and changes color based on the usage severity.
 * 
 * Key Logic:
 * 1. Data Fetching: Uses the useQuota hook to fetch and monitor token usage.
 * 2. Status Color Mapping: Dynamically assigns colors based on whether usage is ok, warning, critical, or exceeded.
 * 3. Responsive States: Renders a simplified icon-only view when the sidebar is collapsed.
 * 
 * Props:
 * @param {boolean} collapsed - Indicates if the sidebar is in a collapsed state.
 */
export function QuotaIndicator({ collapsed }: { collapsed: boolean }) {
  const { summary, pct, status } = useQuota(120_000); // re-fetch every 2 min (120,000ms)

  if (!summary) return null;

  // Define visual states for different quota levels
  const colors = {
    ok: "bg-primary",
    warning: "bg-amber-500",
    critical: "bg-orange-500",
    exceeded: "bg-destructive",
  };

  const textColors = {
    ok: "text-muted-foreground",
    warning: "text-amber-500",
    critical: "text-orange-500",
    exceeded: "text-destructive",
  };

  if (collapsed) {
    return (
      <Link
        href="/dashboard"
        className={cn(
          "flex items-center justify-center p-2 rounded-lg transition-colors",
          status !== "ok"
            ? "text-amber-500 hover:bg-sidebar-accent"
            : "text-muted-foreground/40 hover:bg-sidebar-accent",
        )}
        title={`Quota: ${pct.toFixed(1)}%`}
      >
        <TrendingUp className="w-4 h-4" />
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard"
      className="px-2.5 py-2 rounded-lg hover:bg-sidebar-accent transition-colors block"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-sidebar-foreground/50">Token quota</span>
        <span className={cn("text-xs font-medium tabular-nums", textColors[status])}>
          {pct.toFixed(1)}%
        </span>
      </div>

      {/* Track */}
      <div className="h-1.5 bg-sidebar-border rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", colors[status])}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {status !== "ok" && (
        <div className={cn("flex items-center gap-1 mt-1.5", textColors[status])}>
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span className="text-xs">
            {status === "exceeded"
              ? "Quota exceeded"
              : `${formatTokens(summary.quotaLimit - summary.totalTokens)} remaining`}
          </span>
        </div>
      )}
    </Link>
  );
}
