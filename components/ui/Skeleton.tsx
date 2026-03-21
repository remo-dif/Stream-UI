import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/**
 * Base Skeleton Component
 * 
 * A simple pulse-animated placeholder used to represent content that is still loading.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className,
      )}
    />
  );
}

/**
 * MessageSkeleton Component
 * 
 * Specifically designed to mimic the structure of a chat conversation (alternating bubbles).
 */
export function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 max-w-3xl mx-auto w-full">
      {/* User message skeleton */}
      <div className="flex items-end gap-3 flex-row-reverse">
        <Skeleton className="w-7 h-7 rounded-full shrink-0" />
        <Skeleton className="h-10 w-48 rounded-2xl rounded-br-sm" />
      </div>
      {/* Assistant message skeleton */}
      <div className="flex items-end gap-3 flex-row">
        <Skeleton className="w-7 h-7 rounded-full shrink-0" />
        <div className="space-y-2 flex-1 max-w-md">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-4/6 rounded" />
        </div>
      </div>
      {/* Another user message skeleton */}
      <div className="flex items-end gap-3 flex-row-reverse">
        <Skeleton className="w-7 h-7 rounded-full shrink-0" />
        <Skeleton className="h-10 w-64 rounded-2xl rounded-br-sm" />
      </div>
    </div>
  );
}

/**
 * DashboardSkeleton Component
 * 
 * Mimics the layout of the usage dashboard with cards and a large chart area.
 */
export function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
