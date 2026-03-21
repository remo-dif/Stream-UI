"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { jobsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useRequireAuth } from "@/hooks/useAuth";
import { useOptimisticJobs, useJobPoller } from "@/hooks/useJobPoller";
import { formatDate, cn } from "@/lib/utils";
import type { AsyncJob, JobStatus } from "@/types";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: JobStatus }) {
  const configs: Record<JobStatus, { label: string; icon: React.ElementType; className: string }> = {
    waiting: { label: "Waiting", icon: Clock, className: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    active: { label: "Processing", icon: Play, className: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    completed: { label: "Completed", icon: CheckCircle2, className: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    failed: { label: "Failed", icon: XCircle, className: "text-destructive bg-destructive/10 border-destructive/20" },
    delayed: { label: "Delayed", icon: RefreshCw, className: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
  };

  const { label, icon: Icon, className } = configs[status];

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium", className)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ─── Job row with inline polling ──────────────────────────────────────────────

function JobRow({ job: initialJob }: { job: AsyncJob }) {
  const isTerminal = ["completed", "failed"].includes(initialJob.status);
  const { job: polledJob } = useJobPoller(isTerminal ? null : initialJob.id);
  const job = polledJob ?? initialJob;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card border border-border rounded-xl animate-fade-in">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <StatusBadge status={job.status} />
          <span className="text-xs text-muted-foreground font-mono">
            {job.id.slice(0, 12)}…
          </span>
        </div>
        <p className="text-sm text-foreground truncate">{job.prompt}</p>
        {job.result && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {job.result}
          </p>
        )}
        {job.error && (
          <p className="text-xs text-destructive mt-1">{job.error}</p>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {/* Progress bar for active jobs */}
        {job.status === "active" && (
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        )}

        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {formatDate(job.createdAt)}
          </p>
          <p className="text-xs text-muted-foreground/50">
            Attempt {job.attempts}/{job.maxAttempts}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Submit modal ─────────────────────────────────────────────────────────────

function SubmitJobModal({
  onSubmit,
  onClose,
  isSubmitting,
}: {
  onSubmit: (prompt: string) => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
        <h2 className="font-semibold mb-4">Submit Async Job</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Jobs are processed in the background by BullMQ workers and won&apos;t block your chat.
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a complex prompt for background processing…"
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(prompt)}
            disabled={!prompt.trim() || isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Job
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * JobsPage Component
 * 
 * A management interface for background AI tasks (Async Jobs).
 * It uses BullMQ on the backend to handle long-running processes without blocking the UI.
 * 
 * Key Logic:
 * 1. Optimistic Updates: Uses useOptimisticJobs to show new jobs immediately before backend confirmation.
 * 2. Real-time Polling: Each job row independently polls its status until it reaches a terminal state.
 * 3. Background Processing: Decouples AI generation from the main chat stream for complex or slow tasks.
 */
export default function JobsPage() {
  useRequireAuth();
  const { token } = useAuthStore();
  const { jobs, setJobs, submitJob, isSubmitting } = useOptimisticJobs();
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Load the initial list of background jobs
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const { data } = await jobsApi.list(token, 1, 20);
        setJobs(data);
      } catch {
        // silently fail - list may be empty or API unavailable
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [token, setJobs]);

  const handleSubmit = async (prompt: string) => {
    setShowModal(false);
    const jobId = await submitJob(prompt);
    if (jobId) {
      toast.success("Job submitted", { description: `Job ID: ${jobId.slice(0, 8)}…` });
    } else {
      toast.error("Failed to submit job");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Async Jobs
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Background AI processing via BullMQ
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Job
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No jobs yet. Submit one to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <SubmitJobModal
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
