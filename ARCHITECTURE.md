# StreamAI — Architecture, Scaling & Operations

> Production documentation for the Next.js frontend + NestJS backend AI SaaS platform.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Architecture Decisions](#frontend-architecture-decisions)
3. [Streaming Architecture](#streaming-architecture)
4. [Authentication & Multi-Tenancy](#authentication--multi-tenancy)
5. [Scaling Strategy](#scaling-strategy)
6. [Cost Analysis](#cost-analysis)
7. [Failure Strategy](#failure-strategy)
8. [Performance Optimisation](#performance-optimisation)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (Next.js 15 + React 19)                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  useChat    │  │  Dashboard   │  │  Admin Panel │               │
│  │  @ai-sdk/   │  │  (Recharts)  │  │  (RBAC)      │               │
│  │  react v5   │  │              │  │              │               │
│  └──────┬──────┘  └──────────────┘  └──────────────┘               │
└─────────┼───────────────────────────────────────────────────────────┘
          │ POST /api/chat (SSE response)
┌─────────▼───────────────────────────────────────────────────────────┐
│  Next.js App Router  (Node.js runtime, Vercel / ECS)                │
│  /api/chat → thin proxy + rate-limit header passthrough             │
└─────────┬───────────────────────────────────────────────────────────┘
          │ Bearer JWT   text/event-stream
┌─────────▼───────────────────────────────────────────────────────────┐
│  Nginx  (SSL termination, upstream load balancing)                  │
└─────────┬───────────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────────────┐
│  NestJS API  (ECS Fargate containers)                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  auth/   │ │  chat/   │ │  usage/  │ │  jobs/   │ │  admin/  │ │
│  │ Supabase │ │ SSE +    │ │ TypeORM  │ │ BullMQ   │ │ RBAC     │ │
│  │ JWT      │ │ Anthropic│ │ Redis    │ │ Worker   │ │ Guards   │ │
│  └──────────┘ └────┬─────┘ └──────────┘ └────┬─────┘ └──────────┘ │
└────────────────────┼──────────────────────────┼────────────────────┘
                     │                          │
          ┌──────────▼──────────┐   ┌──────────▼──────────┐
          │  Anthropic API      │   │  Redis (ElastiCache) │
          │  claude-3-5-sonnet  │   │  • BullMQ queues     │
          │  Streaming SDK      │   │  • Token counters    │
          └─────────────────────┘   │  • Session cache     │
                                    └─────────────────────┘
                     │
          ┌──────────▼──────────┐
          │  PostgreSQL (RDS)    │
          │  • users/tenants     │
          │  • conversations     │
          │  • usage_logs        │
          └─────────────────────┘
```

---

## Frontend Architecture Decisions

### Why Next.js 15 App Router

- **Streaming-first**: App Router treats HTTP streams as first-class. `route.ts` handlers can pipe NestJS SSE directly to the browser with zero buffering.
- **Co-location**: Each feature owns its `page.tsx`, `layout.tsx`, and `loading.tsx` in a single directory. No barrel-file hell.
- **Server Components**: Static shells render instantly on CDN edge; interactive chat islands hydrate lazily.

### Why AI SDK v5 (`@ai-sdk/react`)

AI SDK v5 introduced a **transport abstraction** that decouples the hook from any specific endpoint format. The `useChat` hook no longer owns the `input` state — this is intentional: you control the input lifecycle, which enables features like:

- Editing messages in place (`sendMessage({ messageId })`)
- Multi-modal inputs (files alongside text)
- Reconnecting to interrupted streams (`resumeStream()`)

The `transport` option in `useChat` is used to inject the Supabase `Authorization` header and the `conversationId` on every request, without polluting the global fetch.

```ts
// How the transport intercepts each request
transport: {
  async sendMessages({ messages, abortController }) {
    return fetch('/api/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages, conversationId }),
      signal: abortController?.signal,
    });
  },
},
```

### Why Zustand over React Context

- Zero re-renders outside of subscribed components
- `persist` middleware syncs `token` to `localStorage` for page refresh
- Immer-compatible for complex state mutations (future: conversation cache)

### State layers

| Layer | Tool | Scope |
|---|---|---|
| Server state | Native `fetch` + `useEffect` | API data (conversations, usage logs) |
| Auth | Zustand + Supabase listener | Global, persisted |
| Chat messages | `useChat` internal state | Per-conversation |
| Optimistic UI | Local component state | Jobs page |
| Theme | `next-themes` | Global, persisted |

---

## Streaming Architecture

### The SSE pipeline

```
useChat (browser)
  → POST /api/chat (Next.js route handler)
    → fetch /chat/conversations/:id/stream (NestJS)
      → Anthropic streaming SDK
        → Server-Sent Events chunks
      ← NestJS pipes Anthropic stream → SSE
    ← Next.js pipes SSE response body
  ← useChat parses SSE via AI SDK stream protocol
    → React state updates (messages[])
      → ChatMessage re-renders with streamed text
```

### Why a Next.js proxy route?

The NestJS server is not directly exposed to the browser (it sits behind Nginx in production). The Next.js `/api/chat` route:

1. Validates the session exists
2. Injects the `Authorization` header
3. Translates NestJS HTTP errors (429, 402) into structured responses the UI can act on
4. Sets `Cache-Control: no-cache` and `X-Accel-Buffering: no` to prevent Nginx/Vercel from buffering the stream

### Stream protocol compatibility

NestJS streams Anthropic responses as `text/event-stream`. AI SDK v5 consumes a response stream and expects chunks in its own [UI stream protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol).

To bridge this without running the full AI SDK Core on the backend, there are two options:

**Option A (current):** NestJS emits raw Anthropic SSE and we rely on AI SDK's `readUIMessageStream` to parse compatible data parts.

**Option B (recommended for production):** Install `ai` package on NestJS and use `pipeUIMessageStreamToResponse` to emit the correct protocol with token-usage metadata injected as `data` parts:

```ts
// NestJS chat.service.ts (recommended addition)
import { pipeUIMessageStreamToResponse, createUIMessageStream } from 'ai';

async streamToResponse(res: Response, prompt: string) {
  const stream = createUIMessageStream({
    execute: async (writer) => {
      const result = await streamText({ model: anthropic('claude-3-5-sonnet'), prompt });
      writer.merge(result.toUIMessageStream());
      // Inject token usage as metadata
      result.usage.then((usage) => {
        writer.write({ type: 'data', data: { tokenUsage: usage } });
      });
    },
  });
  pipeUIMessageStreamToResponse(stream, res);
}
```

---

## Authentication & Multi-Tenancy

### Token flow

```
1. Browser → Supabase signInWithPassword()
2. Supabase → Returns JWT (access_token)
3. Browser stores JWT in Zustand (localStorage-persisted)
4. Every request → Authorization: Bearer <jwt>
5. NestJS SupabaseAuthGuard → supabase.auth.getUser(jwt)
6. Guard attaches { userId, tenantId, role } to request context
7. TypeORM queries filter by tenantId automatically
```

### RBAC implementation

| Role | Chat | Dashboard | Jobs | Admin |
|---|---|---|---|---|
| `viewer` | Read-only | Own usage | View | ✗ |
| `user` | Full | Own usage | Submit | ✗ |
| `admin` | Full | All tenants | All | Full |

The `@Roles('admin')` decorator on NestJS controllers is mirrored in the Next.js UI — admin-only routes show an "Access Denied" screen when the Zustand `user.role` is insufficient.

### Multi-tenancy isolation

Every PostgreSQL query in NestJS includes `WHERE tenant_id = :tenantId`. The `tenantId` is extracted from the verified JWT, never from the request body — preventing tenant-hopping attacks.

---

## Scaling Strategy

### Horizontal scaling targets

| Component | Strategy | Target |
|---|---|---|
| Next.js | Vercel Edge / ECS Fargate | Auto-scale to 0 |
| NestJS API | ECS Fargate (multiple tasks) | CPU > 70% → +1 task |
| PostgreSQL | RDS Multi-AZ + read replicas | Read replica for analytics |
| Redis | ElastiCache cluster mode | 3 shards |
| BullMQ workers | Separate ECS task definition | Scale on queue depth |

### Queue-based backpressure

When Anthropic rate-limits the NestJS service, new chat requests are rejected with `429`. Heavy workloads (document summarisation, bulk analysis) should be submitted as **async jobs** via the `/jobs` endpoint instead of the real-time chat stream. BullMQ provides:

- Automatic retry with exponential backoff (configured in `ai-job.processor.ts`)
- Dead-letter queue for permanently failed jobs
- Priority queues for Pro/Enterprise tenants
- Worker concurrency capped at `MAX_ANTHROPIC_RPS / worker_count`

### CDN and caching strategy

```
Static assets     → CloudFront (immutable, 1 year)
API responses     → No cache (streaming, personalised)
Conversation list → SWR stale-while-revalidate (30s)
Usage dashboard   → Redis cache (5 min TTL), busted on new completion
Token counters    → Redis INCR (atomic, no DB write per token)
```

---

## Cost Analysis

### Anthropic API costs (claude-3-5-sonnet-20241022)

| Tier | Monthly tokens | Input cost | Output cost | Total |
|---|---|---|---|---|
| Free | 100K | $0.30 | $1.50 | ~$1.80 |
| Pro | 5M | $15 | $75 | ~$90 |
| Enterprise | 100M | $300 | $1,500 | ~$1,800 |

*Pricing: $3/1M input tokens, $15/1M output tokens*

### Infrastructure costs (AWS, us-east-1)

| Component | Spec | Monthly |
|---|---|---|
| ECS Fargate (NestJS, 2 tasks) | 0.5 vCPU, 1 GB | ~$25 |
| ECS Fargate (Next.js, 2 tasks) | 0.25 vCPU, 512 MB | ~$12 |
| RDS PostgreSQL (t3.micro) | Multi-AZ | ~$30 |
| ElastiCache Redis (t3.micro) | Single node | ~$15 |
| Application Load Balancer | — | ~$18 |
| CloudFront + S3 | ~100 GB transfer | ~$10 |
| **Total infrastructure** | | **~$110/month** |

### Cost optimisation levers

1. **Prompt caching**: Use Anthropic's prompt caching for system prompts shared across tenant users (90% cost reduction on repeated tokens).
2. **Model routing**: Route simple queries to `claude-haiku` (20x cheaper), complex ones to `claude-sonnet`.
3. **Quota enforcement**: `QuotaGuard` in NestJS hard-stops requests before they hit Anthropic when the monthly limit is reached.
4. **Token counting**: Count tokens client-side (via `@anthropic-ai/tokenizer`) before submitting to catch accidental very-long prompts.

---

## Failure Strategy

### Failure modes and mitigations

| Failure | Detection | Mitigation |
|---|---|---|
| Anthropic API down | `status.anthropic.com` webhook | Fallback message + queue job for retry |
| NestJS pod crash | ECS health check fails | ALB routes to healthy task; ECS restarts crashed task |
| Redis unavailable | Connection error on startup | NestJS falls back to in-memory counters; BullMQ pauses |
| PostgreSQL unavailable | TypeORM connection error | Return cached responses; queue writes |
| Stream interrupted mid-response | `useChat` `onError` + `isDisconnect` | `resumeStream()` automatically reconnects |
| Rate limit (429) | Response header `Retry-After` | UI shows countdown; `withRetry()` backs off |
| Quota exceeded (402) | NestJS `QuotaGuard` | UI disables input; shows upgrade CTA |
| JWT expired | Supabase `onAuthStateChange` | Silently refresh token; retry failed request |

### Circuit breaker pattern

For production, wrap Anthropic calls in a circuit breaker (e.g., `opossum`) that:

1. **Closed**: Normal operation
2. **Open**: After 5 failures in 10s, reject immediately with `503`
3. **Half-open**: After 30s, let 1 request through to test recovery

```ts
// NestJS ai.service.ts addition
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(callAnthropic, {
  timeout: 30_000,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
});

breaker.fallback(() => ({
  stream: null,
  error: 'AI service temporarily unavailable',
}));
```

### Data durability

- All chat messages are persisted to PostgreSQL **before** the Anthropic call
- If the stream fails mid-response, the partial assistant message is saved with a `partial: true` flag
- On reconnect, `useChat`'s `resume: true` option re-fetches the conversation state

---

## Performance Optimisation

### Frontend

| Technique | Implementation | Impact |
|---|---|---|
| Streaming UI | `useChat` status-based rendering | Perceived latency -70% |
| Virtual scrolling | Add `react-virtual` for 1000+ messages | Memory -60% |
| Code splitting | Next.js per-route chunks | Initial JS -40% |
| Optimistic updates | Jobs submitted before API confirms | Instant feedback |
| Debounced re-renders | `experimental_throttle` in `useChat` | CPU -30% during streaming |
| Memoised message list | `React.memo` on `ChatMessage` | Re-renders -80% |

### Backend

| Technique | Implementation | Impact |
|---|---|---|
| Redis token counters | `INCR` instead of DB write | 100x faster quota checks |
| Connection pooling | TypeORM pool size 10 | 5x throughput |
| Keep-alive | Anthropic SDK persistent HTTP agent | -200ms per request |
| Prompt caching | System prompt cache key | -90% cost on cached tokens |
| Read replicas | Usage/analytics queries to replica | API latency -40ms |
| Response compression | Nginx gzip (non-SSE routes) | Bandwidth -70% |

### Measuring performance

Key metrics to track in CloudWatch / Datadog:

```
p50_latency: time to first token (target < 800ms)
p99_latency: total stream duration (target < 15s)
error_rate: 5xx / total requests (target < 0.1%)
queue_depth: BullMQ waiting jobs (alert > 100)
quota_headroom: remaining tokens / quota (alert < 20%)
token_efficiency: completion_tokens / prompt_tokens (optimise prompts if < 0.3)
```

---

*Last updated: 2026-03. Architecture version: 2.0*
