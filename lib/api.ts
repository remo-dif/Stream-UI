import type {
  AuthUser,
  Conversation,
  UsageSummary,
  UsageLog,
  DailyUsage,
  AsyncJob,
  AdminUser,
  Tenant,
  PaginatedResponse,
} from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Core API Wrapper
 * 
 * Centralized fetch utility that handles:
 * 1. Auth Header Injection: Bearer token from the auth store.
 * 2. Status Validation: Automatically throws ApiError for non-2xx responses.
 * 3. Body Parsing: Gracefully handles empty responses.
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || "Request failed");
  }

  return res.json();
}

/**
 * Resilience Helper: withRetry
 * 
 * Implements exponential backoff for transient failures. 
 * Retries on:
 * - 429 (Rate Limit)
 * - 5xx (Server Error)
 * Does NOT retry on 4xx (Client Error) like 401 or 403.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 500,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      
      const isRateLimit = err instanceof ApiError && err.statusCode === 429;
      const isServerError = err instanceof ApiError && err.statusCode >= 500;

      // Fail fast if the error is non-retryable
      if (!isRateLimit && !isServerError) throw err;

      // Exponential backoff: base * 2^attempt
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  me: (token: string): Promise<AuthUser> =>
    apiFetch("/auth/me", { token }),

  signIn: (email: string, password: string) =>
    apiFetch<{ access_token: string; user: AuthUser }>("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  signUp: (email: string, password: string) =>
    apiFetch<{ access_token: string; user: AuthUser }>("/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chatApi = {
  listConversations: (token: string): Promise<Conversation[]> =>
    apiFetch("/chat/conversations", { token }),

  getConversation: (id: string, token: string): Promise<Conversation> =>
    apiFetch(`/chat/conversations/${id}`, { token }),

  createConversation: (
    title: string,
    token: string,
  ): Promise<Conversation> =>
    apiFetch("/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ title }),
      token,
    }),

  deleteConversation: (id: string, token: string): Promise<void> =>
    apiFetch(`/chat/conversations/${id}`, { method: "DELETE", token }),

  /**
   * Returns the SSE streaming URL for a conversation.
   * useChat will POST here with the message body.
   */
  streamUrl: (conversationId: string) =>
    `${BASE_URL}/chat/conversations/${conversationId}/stream`,
};

// ─── Usage ────────────────────────────────────────────────────────────────────

export const usageApi = {
  summary: (token: string): Promise<UsageSummary> =>
    apiFetch("/usage/summary", { token }),

  logs: (
    token: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<UsageLog>> =>
    apiFetch(`/usage/logs?page=${page}&limit=${limit}`, { token }),

  daily: (token: string, days = 30): Promise<DailyUsage[]> =>
    apiFetch(`/usage/daily?days=${days}`, { token }),
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const jobsApi = {
  submit: (
    prompt: string,
    token: string,
  ): Promise<{ jobId: string }> =>
    apiFetch("/jobs", {
      method: "POST",
      body: JSON.stringify({ prompt }),
      token,
    }),

  status: (jobId: string, token: string): Promise<AsyncJob> =>
    apiFetch(`/jobs/${jobId}`, { token }),

  list: (
    token: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponse<AsyncJob>> =>
    apiFetch(`/jobs?page=${page}&limit=${limit}`, { token }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  listUsers: (
    token: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<AdminUser>> =>
    apiFetch(`/admin/users?page=${page}&limit=${limit}`, { token }),

  updateUserRole: (
    userId: string,
    role: string,
    token: string,
  ): Promise<AdminUser> =>
    apiFetch(`/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
      token,
    }),

  deactivateUser: (userId: string, token: string): Promise<void> =>
    apiFetch(`/admin/users/${userId}/deactivate`, {
      method: "POST",
      token,
    }),
};

// ─── Tenants ──────────────────────────────────────────────────────────────────

export const tenantsApi = {
  get: (id: string, token: string): Promise<Tenant> =>
    apiFetch(`/tenants/${id}`, { token }),

  list: (token: string): Promise<Tenant[]> =>
    apiFetch("/tenants", { token }),

  create: (
    name: string,
    token: string,
  ): Promise<Tenant> =>
    apiFetch("/tenants", {
      method: "POST",
      body: JSON.stringify({ name }),
      token,
    }),
};
