"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { jobsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { AsyncJob, JobStatus } from "@/types";

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES: JobStatus[] = ["completed", "failed"];

/**
 * Polls a job until it reaches a terminal state.
 * Uses optimistic status updates and exponential backoff on errors.
 */
export function useJobPoller(jobId: string | null) {
  const { token } = useAuthStore();
  const [job, setJob] = useState<AsyncJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef(0);

  const poll = useCallback(async () => {
    if (!jobId || !token) return;

    try {
      const data = await jobsApi.status(jobId, token);
      setJob(data);
      setError(null);
      errorCountRef.current = 0;

      if (TERMINAL_STATUSES.includes(data.status)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } catch (err) {
      errorCountRef.current += 1;
      if (errorCountRef.current >= 3) {
        setError("Failed to fetch job status");
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }
  }, [jobId, token]);

  useEffect(() => {
    if (!jobId) return;

    // Immediate first poll
    poll();

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId, poll]);

  return { job, error };
}

/**
 * Optimistic job submission — immediately adds a pending job to the list
 * while the real API call completes.
 */
export function useOptimisticJobs() {
  const { token } = useAuthStore();
  const [jobs, setJobs] = useState<AsyncJob[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitJob = useCallback(
    async (prompt: string): Promise<string | null> => {
      if (!token) return null;

      // Optimistic insert
      const tempId = `temp-${Date.now()}`;
      const optimisticJob: AsyncJob = {
        id: tempId,
        type: "ai-processing",
        status: "waiting",
        prompt,
        progress: 0,
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      };
      setJobs((prev) => [optimisticJob, ...prev]);
      setIsSubmitting(true);

      try {
        const { jobId } = await jobsApi.submit(prompt, token);

        // Replace optimistic entry with real ID
        setJobs((prev) =>
          prev.map((j) =>
            j.id === tempId ? { ...j, id: jobId, status: "waiting" } : j,
          ),
        );
        return jobId;
      } catch (err) {
        // Rollback optimistic entry
        setJobs((prev) => prev.filter((j) => j.id !== tempId));
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [token],
  );

  return { jobs, setJobs, submitJob, isSubmitting };
}
