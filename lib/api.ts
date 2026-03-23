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

/**
 * FIX: BASE_URL is the NestJS origin only.
 * All paths below include the full /api/v1 prefix to match NestJS routes.
 * The original code was missing this prefix on every single endpoint,
 * meaning every API call would 404 in production.
 */
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

  // Handle 204 No Content
  if (res.status === 204) return undefined as unknown as T;

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

      if (!isRateLimit && !isServerError) throw err;

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// FIX: All paths now use /api/v1 prefix matching NestJS controller routes.

export const authApi = {
  // FIX: was /auth/me — endpoint is GET /api/v1/auth/user
  me: (token: string): Promise<AuthUser> =>
    apiFetch("/api/v1/auth/user", { token }),

  // FIX: was /auth/sign-in — NestJS route is POST /api/v1/auth/signin
  signIn: (email: string, password: string) =>
    apiFetch<{ access_token: string; user: AuthUser }>("/api/v1/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // FIX: was /auth/sign-up — NestJS route is POST /api/v1/auth/signup
  signUp: (email: string, password: string, tenantId?: string) =>
    apiFetch<{ access_token: string; user: AuthUser }>("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, tenantId }),
    }),

  signOut: (token: string) =>
    apiFetch<void>("/api/v1/auth/signout", { method: "POST", token }),

  refresh: (refreshToken: string) =>
    apiFetch<{ access_token: string }>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chatApi = {
  listConversations: (token: string): Promise<Conversation[]> =>
    apiFetch("/api/v1/chat/conversations", { token }),

  getConversation: (id: string, token: string): Promise<Conversation> =>
    apiFetch(`/api/v1/chat/conversations/${id}`, { token }),

  createConversation: (title: string, token: string): Promise<Conversation> =>
    apiFetch("/api/v1/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ title }),
      token,
    }),

  deleteConversation: (id: string, token: string): Promise<void> =>
    apiFetch(`/api/v1/chat/conversations/${id}`, { method: "DELETE", token }),

  getMessages: (conversationId: string, token: string, limit = 50, before?: string) =>
    apiFetch<any[]>(
      `/api/v1/chat/conversations/${conversationId}/messages?limit=${limit}${before ? `&before=${before}` : ""}`,
      { token },
    ),

  /**
   * FIX: was /chat/conversations/:id/stream — NestJS SSE endpoint is
   * POST /api/v1/chat/conversations/:id/messages
   */
  streamUrl: (conversationId: string) =>
    `${BASE_URL}/api/v1/chat/conversations/${conversationId}/messages`,
};

// ─── Usage ────────────────────────────────────────────────────────────────────

export const usageApi = {
  summary: (token: string): Promise<UsageSummary> =>
    apiFetch("/api/v1/usage/summary", { token }),

  logs: (token: string, page = 1, limit = 20): Promise<PaginatedResponse<UsageLog>> =>
    apiFetch(`/api/v1/usage/logs?page=${page}&limit=${limit}`, { token }),

  daily: (token: string, days = 30): Promise<DailyUsage[]> =>
    apiFetch(`/api/v1/usage/daily?days=${days}`, { token }),
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const jobsApi = {
  submit: (prompt: string, token: string): Promise<{ jobId: string }> =>
    apiFetch("/api/v1/jobs", {
      method: "POST",
      body: JSON.stringify({ prompt }),
      token,
    }),

  status: (jobId: string, token: string): Promise<AsyncJob> =>
    apiFetch(`/api/v1/jobs/${jobId}`, { token }),

  list: (token: string, page = 1, limit = 10): Promise<PaginatedResponse<AsyncJob>> =>
    apiFetch(`/api/v1/jobs?page=${page}&limit=${limit}`, { token }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  listUsers: (token: string, page = 1, limit = 20): Promise<PaginatedResponse<AdminUser>> =>
    apiFetch(`/api/v1/admin/users?page=${page}&limit=${limit}`, { token }),

  updateUserRole: (userId: string, role: string, token: string): Promise<AdminUser> =>
    apiFetch(`/api/v1/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
      token,
    }),

  deactivateUser: (userId: string, token: string): Promise<void> =>
    apiFetch(`/api/v1/admin/users/${userId}/deactivate`, {
      method: "POST",
      token,
    }),
};

// ─── Tenants ──────────────────────────────────────────────────────────────────

export const tenantsApi = {
  get: (id: string, token: string): Promise<Tenant> =>
    apiFetch(`/api/v1/tenants/${id}`, { token }),

  list: (token: string): Promise<Tenant[]> =>
    apiFetch("/api/v1/tenants", { token }),

  create: (name: string, token: string): Promise<Tenant> =>
    apiFetch("/api/v1/tenants", {
      method: "POST",
      body: JSON.stringify({ name }),
      token,
    }),
};
