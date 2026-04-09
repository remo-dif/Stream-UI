// ─── Auth ───────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "user" | "superadmin";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  avatarUrl?: string;
  fullName?: string;
  isActive?: boolean;
}

// ─── Tenant ──────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  plan: "starter" | "pro" | "enterprise";
  quotaTokens: number;
  usedTokens: number;
  createdAt: string;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  title: string;
  model: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tokens?: number | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── Usage ───────────────────────────────────────────────────────────────────

export interface UsageSummary {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalRequests: number;
  avgResponseTime: number;
  quotaUsedPercent: number;
  quotaLimit: number;
  usedTokens: number;
  todayTokens: number;
}

export interface UsageLog {
  id: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  latencyMs: number | null;
  createdAt: string;
}

export interface DailyUsage {
  date: string;
  tokens: number;
  requests: number;
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export type JobStatus = "waiting" | "active" | "completed" | "failed" | "delayed";

export interface AsyncJob {
  id: string;
  type: string;
  status: JobStatus;
  prompt: string;
  result?: string;
  error?: string;
  progress: number;
  createdAt: string;
  completedAt?: string;
  attempts: number;
  maxAttempts: number;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  totalTokens: number;
  lastActive: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// ─── Stream metadata ──────────────────────────────────────────────────────────

export interface TokenUsageMetadata {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  conversationId: string;
  latencyMs?: number;
}
