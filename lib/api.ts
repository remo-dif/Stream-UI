import type {
  AdminUser,
  AsyncJob,
  AuthUser,
  ChatMessage,
  Conversation,
  DailyUsage,
  PaginatedResponse,
  Tenant,
  UsageLog,
  UsageSummary,
  UserRole,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

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
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || body.message || "Request failed");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 500,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;

      const isRateLimit = err instanceof ApiError && err.statusCode === 429;
      const isServerError = err instanceof ApiError && err.statusCode >= 500;

      if (!isRateLimit && !isServerError) throw err;

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

type RawAuthUser = {
  id: string;
  email: string;
  role: UserRole;
  tenant_id: string;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
};

type RawTenant = {
  id: string;
  name: string;
  plan: Tenant["plan"];
  token_quota: number;
  tokens_used: number;
  created_at: string;
};

type RawConversation = {
  id: string;
  title: string;
  model?: string;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
};

type RawMessage = {
  id: string;
  role: ChatMessage["role"];
  content: string;
  tokens?: number | null;
  created_at: string;
};

type RawUsageDashboard = {
  quota: {
    total: number;
    used: number;
    percentage: number;
  };
  today: {
    tokens: number;
  };
  last30Days: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    requestCount: number;
  };
};

type RawUsageLog = {
  id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  created_at: string;
};

type RawAdminUser = {
  id: string;
  email: string;
  role: UserRole;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
};

type RawJob = {
  id: string;
  name?: string;
  status: string;
  progress?: number | Record<string, unknown>;
  data?: {
    payload?: Record<string, unknown>;
    userId?: string;
    tenantId?: string;
  };
  result?: { text?: string } | string | null;
  failedReason?: string;
  attemptsMade?: number;
  opts?: {
    attempts?: number;
  };
  timestamp?: number;
  finishedOn?: number;
};

function mapTenant(raw: RawTenant): Tenant {
  return {
    id: raw.id,
    name: raw.name,
    plan: raw.plan,
    quotaTokens: Number(raw.token_quota ?? 0),
    usedTokens: Number(raw.tokens_used ?? 0),
    createdAt: raw.created_at,
  };
}

function mapAuthUser(raw: RawAuthUser, tenant: RawTenant): AuthUser {
  const metadata = raw.metadata ?? {};

  return {
    id: raw.id,
    email: raw.email,
    role: raw.role,
    tenantId: raw.tenant_id,
    tenantName: tenant.name,
    fullName:
      typeof metadata.fullName === "string"
        ? metadata.fullName
        : typeof metadata.full_name === "string"
          ? metadata.full_name
          : undefined,
    avatarUrl:
      typeof metadata.avatarUrl === "string"
        ? metadata.avatarUrl
        : typeof metadata.avatar_url === "string"
          ? metadata.avatar_url
          : undefined,
    isActive: raw.is_active,
  };
}

function mapConversation(raw: RawConversation): Conversation {
  return {
    id: raw.id,
    title: raw.title,
    model: raw.model ?? "claude-3-5-sonnet-20241022",
    isArchived: raw.is_archived ?? false,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function mapMessage(raw: RawMessage): ChatMessage {
  return {
    id: raw.id,
    role: raw.role,
    content: raw.content,
    tokens: raw.tokens ?? null,
    createdAt: raw.created_at,
  };
}

function mapUsageSummary(raw: RawUsageDashboard): UsageSummary {
  return {
    totalTokens: raw.last30Days.totalTokens,
    promptTokens: raw.last30Days.inputTokens,
    completionTokens: raw.last30Days.outputTokens,
    totalRequests: raw.last30Days.requestCount,
    avgResponseTime: 0,
    quotaUsedPercent: raw.quota.percentage,
    quotaLimit: raw.quota.total,
    usedTokens: raw.quota.used,
    todayTokens: raw.today.tokens,
  };
}

function mapUsageLog(raw: RawUsageLog): UsageLog {
  return {
    id: raw.id,
    model: raw.model,
    promptTokens: raw.input_tokens,
    completionTokens: raw.output_tokens,
    totalTokens: raw.total_tokens,
    latencyMs: null,
    createdAt: raw.created_at,
  };
}

function stringifyJobPayload(payload?: Record<string, unknown>): string {
  if (!payload) return "Background job";

  if (typeof payload.text === "string" && payload.text.trim()) {
    return payload.text;
  }

  if (typeof payload.prompt === "string" && payload.prompt.trim()) {
    return payload.prompt;
  }

  return JSON.stringify(payload);
}

function mapJob(raw: RawJob): AsyncJob {
  const progress =
    typeof raw.progress === "number"
      ? raw.progress
      : typeof raw.progress?.valueOf() === "number"
        ? Number(raw.progress.valueOf())
        : 0;

  return {
    id: String(raw.id),
    type: raw.name ?? "ai-processing",
    status: (raw.status as AsyncJob["status"]) ?? "waiting",
    prompt: stringifyJobPayload(raw.data?.payload),
    result:
      typeof raw.result === "string"
        ? raw.result
        : typeof raw.result?.text === "string"
          ? raw.result.text
          : undefined,
    error: raw.failedReason ?? undefined,
    progress,
    createdAt: raw.timestamp ? new Date(raw.timestamp).toISOString() : new Date().toISOString(),
    completedAt: raw.finishedOn ? new Date(raw.finishedOn).toISOString() : undefined,
    attempts: raw.attemptsMade ?? 0,
    maxAttempts: raw.opts?.attempts ?? 1,
  };
}

export const authApi = {
  async me(token: string): Promise<AuthUser> {
    const [profile, tenant] = await Promise.all([
      apiFetch<RawAuthUser>("/api/v1/auth/user", { token }),
      apiFetch<RawTenant>("/api/v1/tenants/current", { token }),
    ]);

    return mapAuthUser(profile, tenant);
  },

  signUp: (email: string, password: string, tenantId?: string) =>
    apiFetch<{ user: { id: string; email: string }; session: unknown }>(
      "/api/v1/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({ email, password, tenantId }),
      },
    ),

  signOut: (token: string) =>
    apiFetch<void>("/api/v1/auth/signout", { method: "POST", token }),
};

export const chatApi = {
  async listConversations(token: string): Promise<Conversation[]> {
    const data = await apiFetch<RawConversation[]>("/api/v1/chat/conversations", { token });
    return data.map(mapConversation);
  },

  async getConversation(id: string, token: string): Promise<Conversation> {
    const data = await apiFetch<RawConversation>(`/api/v1/chat/conversations/${id}`, { token });
    return mapConversation(data);
  },

  async createConversation(title: string, token: string): Promise<Conversation> {
    const data = await apiFetch<RawConversation>("/api/v1/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ title }),
      token,
    });
    return mapConversation(data);
  },

  deleteConversation: (id: string, token: string): Promise<void> =>
    apiFetch(`/api/v1/chat/conversations/${id}`, { method: "DELETE", token }),

  async getMessages(
    conversationId: string,
    token: string,
    limit = 50,
    before?: string,
  ): Promise<ChatMessage[]> {
    const data = await apiFetch<RawMessage[]>(
      `/api/v1/chat/conversations/${conversationId}/messages?limit=${limit}${before ? `&before=${before}` : ""}`,
      { token },
    );
    return data.map(mapMessage);
  },

  streamUrl: () => "/api/chat",
};

export const usageApi = {
  async summary(token: string): Promise<UsageSummary> {
    const data = await apiFetch<RawUsageDashboard>("/api/v1/usage/dashboard", { token });
    return mapUsageSummary(data);
  },

  async logs(token: string, page = 1, limit = 20): Promise<PaginatedResponse<UsageLog>> {
    const data = await apiFetch<{
      logs: RawUsageLog[];
      page: number;
      limit: number;
      total: number;
    }>(`/api/v1/usage/logs?page=${page}&limit=${limit}`, { token });

    return {
      data: data.logs.map(mapUsageLog),
      page: data.page,
      limit: data.limit,
      total: data.total,
    };
  },

  daily: (token: string, days = 30): Promise<DailyUsage[]> =>
    apiFetch(`/api/v1/usage/daily?days=${days}`, { token }),
};

export const jobsApi = {
  submit: (prompt: string, token: string): Promise<{ jobId: string }> =>
    apiFetch("/api/v1/jobs/submit", {
      method: "POST",
      body: JSON.stringify({
        jobType: "analyze",
        payload: { text: prompt },
      }),
      token,
    }),

  async status(jobId: string, token: string): Promise<AsyncJob> {
    const data = await apiFetch<RawJob>(`/api/v1/jobs/${jobId}`, { token });
    return mapJob(data);
  },

  async list(token: string, page = 1, limit = 10): Promise<PaginatedResponse<AsyncJob>> {
    const data = await apiFetch<RawJob[]>(`/api/v1/jobs?limit=${limit}`, { token });
    return {
      data: data.map(mapJob),
      total: data.length,
      page,
      limit,
    };
  },
};

export const adminApi = {
  async listUsers(token: string): Promise<{ data: AdminUser[] }> {
    const [usersResponse, tenant] = await Promise.all([
      apiFetch<{ users: RawAdminUser[] }>("/api/v1/admin/users", { token }),
      apiFetch<RawTenant>("/api/v1/tenants/current", { token }),
    ]);

    return {
      data: usersResponse.users.map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        tenantName: tenant.name,
        totalTokens: 0,
        lastActive: null,
        isActive: user.is_active,
        createdAt: user.created_at,
      })),
    };
  },

  async updateUserRole(userId: string, role: UserRole, token: string): Promise<AdminUser> {
    const [user, tenant] = await Promise.all([
      apiFetch<RawAdminUser>(`/api/v1/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
        token,
      }),
      apiFetch<RawTenant>("/api/v1/tenants/current", { token }),
    ]);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      tenantName: tenant.name,
      totalTokens: 0,
      lastActive: null,
      isActive: user.is_active,
      createdAt: user.created_at,
    };
  },

  deactivateUser: (userId: string, token: string): Promise<void> =>
    apiFetch(`/api/v1/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
      token,
    }),
};

export const tenantsApi = {
  async current(token: string): Promise<Tenant> {
    const data = await apiFetch<RawTenant>("/api/v1/tenants/current", { token });
    return mapTenant(data);
  },

  create: (name: string, token: string): Promise<Tenant> =>
    apiFetch<RawTenant>("/api/v1/tenants", {
      method: "POST",
      body: JSON.stringify({ name }),
      token,
    }).then(mapTenant),
};

export { ApiError };
