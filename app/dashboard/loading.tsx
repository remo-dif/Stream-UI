import { DashboardSkeleton } from "@/components/ui/Skeleton";

/**
 * DashboardLoading Component
 * 
 * Renders the DashboardSkeleton to provide a smooth transition 
 * while usage data is being fetched.
 */
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
