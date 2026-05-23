"use client";

import { useEffect, useState } from "react";
import type { TooltipProps } from "recharts";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import {
  Activity,
  Clock,
  Loader2,
  MessageSquare,
  TrendingUp,
  Zap,
} from "lucide-react";
import { usageApi } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/lib/store";
import { cn, formatMs, formatTokens } from "@/lib/utils";
import type { DailyUsage, UsageSummary } from "@/types";

type ChartDatum = {
  isoDate: string;
  date: string;
  tokens: number;
  requests: number;
};

function UsageTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }

  const tokens = payload.find((entry) => entry.dataKey === "tokens")?.value;
  const requests = payload.find((entry) => entry.dataKey === "requests")?.value;

  return (
    <div className="rounded-2xl border border-border bg-card/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur">
      <p className="font-semibold text-foreground">{label}</p>
      {typeof tokens === "number" && (
        <p className="mt-1 text-muted-foreground">
          Tokens: <span className="font-medium text-foreground">{formatTokens(tokens)}</span>
        </p>
      )}
      {typeof requests === "number" && (
        <p className="text-muted-foreground">
          Requests: <span className="font-medium text-foreground">{requests}</span>
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { isLoading: authLoading } = useRequireAuth();
  const { token } = useAuthStore();

  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [daily, setDaily] = useState<DailyUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      setIsLoading(true);

      try {
        const [nextSummary, nextDaily] = await Promise.all([
          usageApi.summary(token),
          usageApi.daily(token, 30),
        ]);
        setSummary(nextSummary);
        setDaily(nextDaily);
      } catch {
        setSummary(MOCK_SUMMARY);
        setDaily(MOCK_DAILY);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [token]);

  if (authLoading || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const safeSummary = summary ?? MOCK_SUMMARY;
  const quotaPct = safeSummary.quotaUsedPercent;
  const quotaRemaining = Math.max(
    safeSummary.quotaLimit - safeSummary.totalTokens,
    0,
  );
  const quotaTone =
    quotaPct >= 90
      ? "bg-destructive"
      : quotaPct >= 70
        ? "bg-amber-500"
        : "bg-primary";

  const stats = [
    {
      label: "Total Tokens",
      value: formatTokens(safeSummary.totalTokens),
      icon: Zap,
      sub: `${formatTokens(safeSummary.promptTokens)} prompt / ${formatTokens(safeSummary.completionTokens)} completion`,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Total Requests",
      value: safeSummary.totalRequests.toLocaleString(),
      icon: MessageSquare,
      sub: "completed chat requests",
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      label: "Avg Response",
      value: formatMs(safeSummary.avgResponseTime),
      icon: Clock,
      sub: "end-to-end latency",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Today",
      value: formatTokens(safeSummary.todayTokens),
      icon: Activity,
      sub: "tokens used today",
      color: "text-sky-500",
      bg: "bg-sky-500/10",
    },
  ];

  const chartData: ChartDatum[] = daily.map((entry) => ({
    isoDate: entry.date,
    date: format(parseISO(entry.date), "MMM d"),
    tokens: entry.tokens,
    requests: entry.requests,
  }));

  return (
    <section className="flex h-full w-full flex-col overflow-y-auto">
      <div className="page-shell max-w-6xl">
        <header className="page-header">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Insights
          </span>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h1 className="page-title">Usage Dashboard</h1>
              <p className="page-subtitle">
                Token consumption, request volume, and quota health for the last 30 days.
              </p>
            </div>

            <div className="surface-muted grid gap-3 px-4 py-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Quota Used
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {quotaPct.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Remaining
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {formatTokens(quotaRemaining)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  30-Day Volume
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {formatTokens(safeSummary.totalTokens)}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)]">
          <section className="surface-panel p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Quota Usage</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatTokens(safeSummary.totalTokens)} of {formatTokens(safeSummary.quotaLimit)} tokens used
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                {quotaRemaining > 0
                  ? `${formatTokens(quotaRemaining)} remaining`
                  : "Quota exhausted"}
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-700", quotaTone)}
                style={{ width: `${Math.min(quotaPct, 100)}%` }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Number(quotaPct.toFixed(1))}
                aria-label="Quota usage"
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Usage Status
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {quotaPct >= 90
                    ? "Critical"
                    : quotaPct >= 70
                      ? "Monitor closely"
                      : "Healthy"}
                </p>
              </div>
              <div className="surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Today
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatTokens(safeSummary.todayTokens)} tokens
                </p>
              </div>
              <div className="surface-muted px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Request Load
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {safeSummary.totalRequests.toLocaleString()} total requests
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {stats.map(({ label, value, icon: Icon, sub, color, bg }) => (
              <article key={label} className="metric-card min-w-0">
                <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-2xl", bg)}>
                  <Icon className={cn("h-4 w-4", color)} />
                </div>
                <p className="truncate text-2xl font-semibold text-foreground">{value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-sm text-muted-foreground/80">{sub}</p>
              </article>
            ))}
          </section>
        </div>

        <div className="grid gap-4 2xl:grid-cols-2">
          <section className="surface-panel min-w-0 p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Daily Token Usage
              </h2>
              <p className="text-sm text-muted-foreground">
                Track which days are driving the most model usage.
              </p>
            </div>

            <div className="h-[260px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    width={44}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => formatTokens(value)}
                  />
                  <Tooltip content={<UsageTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="tokens"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.2}
                    fill="url(#tokenGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="surface-panel min-w-0 p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Daily Requests
              </h2>
              <p className="text-sm text-muted-foreground">
                Compare request bursts with the token trend above.
              </p>
            </div>

            <div className="h-[260px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    width={36}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<UsageTooltip />} />
                  <Bar
                    dataKey="requests"
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={24}
                    opacity={0.85}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

const MOCK_SUMMARY: UsageSummary = {
  totalTokens: 142_000,
  promptTokens: 85_000,
  completionTokens: 57_000,
  totalRequests: 324,
  avgResponseTime: 1240,
  quotaUsedPercent: 47.3,
  quotaLimit: 300_000,
  usedTokens: 142_000,
  todayTokens: 4_200,
};

const MOCK_DAILY: DailyUsage[] = Array.from({ length: 30 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - index));

  return {
    date: date.toISOString().split("T")[0],
    tokens: Math.floor(2000 + Math.random() * 8000),
    requests: Math.floor(5 + Math.random() * 20),
  };
});
