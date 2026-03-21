"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Zap, TrendingUp, MessageSquare, Clock, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { usageApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useRequireAuth } from "@/hooks/useAuth";
import { formatTokens, formatMs, cn } from "@/lib/utils";
import type { UsageSummary, DailyUsage } from "@/types";

/**
 * DashboardPage Component
 * 
 * Provides a comprehensive overview of the user's/tenant's token usage 
 * and request analytics over the last 30 days.
 * 
 * Key Features:
 * 1. Usage Summary: Displays high-level stats like total tokens, avg response time, and quota.
 * 2. Visualizations: Uses Recharts (AreaChart, BarChart) to show daily trends.
 * 3. Quota Management: Shows a visual progress bar of token consumption against the limit.
 * 4. Data Loading: Fetches data from usageApi with fallback to mock data for demo purposes.
 */
export default function DashboardPage() {
  useRequireAuth();
  const { token } = useAuthStore();

  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [daily, setDaily] = useState<DailyUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch usage stats on component mount
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [s, d] = await Promise.all([
          usageApi.summary(token),
          usageApi.daily(token, 30),
        ]);
        setSummary(s);
        setDaily(d);
      } catch {
        // Fallback to mock data for demo/prototyping if the API is unavailable
        setSummary(MOCK_SUMMARY);
        setDaily(MOCK_DAILY);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [token]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const quotaPct = summary?.quotaUsedPercent ?? 0;

  const stats = [
    {
      label: "Total Tokens",
      value: formatTokens(summary?.totalTokens ?? 0),
      icon: Zap,
      sub: `${formatTokens(summary?.promptTokens ?? 0)} prompt · ${formatTokens(summary?.completionTokens ?? 0)} completion`,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Total Requests",
      value: (summary?.totalRequests ?? 0).toLocaleString(),
      icon: MessageSquare,
      sub: "chat completions",
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      label: "Avg Response",
      value: formatMs(summary?.avgResponseTime ?? 0),
      icon: Clock,
      sub: "end-to-end latency",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Quota Used",
      value: `${quotaPct.toFixed(1)}%`,
      icon: TrendingUp,
      sub: `of ${formatTokens(summary?.quotaLimit ?? 0)} tokens`,
      color: quotaPct > 80 ? "text-destructive" : "text-amber-500",
      bg: quotaPct > 80 ? "bg-destructive/10" : "bg-amber-500/10",
    },
  ];

  const chartData = daily.map((d) => ({
    date: format(parseISO(d.date), "MMM d"),
    tokens: d.tokens,
    requests: d.requests,
  }));

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full px-6 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">Usage Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Token consumption and request analytics for the last 30 days
          </p>
        </div>

        {/* Quota bar */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Quota Usage</span>
            <span className="text-sm text-muted-foreground">
              {formatTokens(summary?.totalTokens ?? 0)} / {formatTokens(summary?.quotaLimit ?? 0)} tokens
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                quotaPct > 80 ? "bg-destructive" : quotaPct > 60 ? "bg-amber-500" : "bg-primary",
              )}
              style={{ width: `${Math.min(quotaPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-muted-foreground">{quotaPct.toFixed(1)}% used</span>
            <span className="text-xs text-muted-foreground">
              {formatTokens((summary?.quotaLimit ?? 0) - (summary?.totalTokens ?? 0))} remaining
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon, sub, color, bg }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-4">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", bg)}>
                <Icon className={cn("w-4 h-4", color)} />
              </div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{sub}</p>
            </div>
          ))}
        </div>

        {/* Token trend chart */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold text-sm mb-4">Daily Token Usage</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatTokens(v)}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "10px",
                  fontSize: "12px",
                }}
                formatter={(v: number) => [formatTokens(v), "Tokens"]}
              />
              <Area
                type="monotone"
                dataKey="tokens"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#tokenGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Requests bar chart */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold text-sm mb-4">Daily Requests</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "10px",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="requests"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Mock data (used when API is not yet connected) ───────────────────────────

const MOCK_SUMMARY: UsageSummary = {
  totalTokens: 142_000,
  promptTokens: 85_000,
  completionTokens: 57_000,
  totalRequests: 324,
  avgResponseTime: 1240,
  quotaUsedPercent: 47.3,
  quotaLimit: 300_000,
};

const MOCK_DAILY: DailyUsage[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  return {
    date: d.toISOString().split("T")[0],
    tokens: Math.floor(2000 + Math.random() * 8000),
    requests: Math.floor(5 + Math.random() * 20),
  };
});
