# StreamAI — Next.js Frontend

> Production-grade multi-tenant AI chat interface built on top of [Stream-API](https://github.com/remo-dif/Stream-API) (NestJS).

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v3 + shadcn design tokens |
| AI Hooks | AI SDK v5 (`@ai-sdk/react` — `useChat`) |
| Auth | Supabase SSR (`@supabase/ssr`) |
| State | Zustand v5 (persisted auth) |
| Charts | Recharts |
| Markdown | react-markdown + remark-gfm |
| Code highlight | react-syntax-highlighter (Prism) |
| Notifications | Sonner |
| Icons | Lucide React |

---

## Project Structure

```
stream-ui/
├── app/
│   ├── api/chat/route.ts          # Proxy → NestJS SSE stream
│   ├── chat/
│   │   ├── layout.tsx             # Sidebar wrapper
│   │   ├── page.tsx               # New chat landing
│   │   ├── loading.tsx            # Skeleton while hydrating
│   │   └── [conversationId]/
│   │       └── page.tsx           # Active conversation
│   ├── dashboard/page.tsx         # Token usage + charts
│   ├── jobs/page.tsx              # Async BullMQ jobs
│   ├── admin/page.tsx             # User management (admin only)
│   ├── settings/page.tsx          # Profile + tenant settings
│   ├── login/page.tsx             # Supabase auth
│   ├── global-error.tsx           # Error boundary
│   └── not-found.tsx
│
├── components/
│   ├── AppSidebar.tsx             # Nav + conversation list + quota
│   ├── QuotaIndicator.tsx         # Live quota progress bar
│   ├── chat/
│   │   ├── ChatWindow.tsx         # useChat orchestrator ← main component
│   │   ├── ChatMessage.tsx        # Bubble + markdown + copy/regen
│   │   ├── ChatInput.tsx          # Controlled textarea + send/stop
│   │   ├── ChatErrorBanner.tsx    # Rate-limit countdown + retry
│   │   ├── TokenBadge.tsx         # Animated token count
│   │   └── TypingIndicator.tsx    # Animated dots
│   └── ui/
│       └── Skeleton.tsx           # Loading skeletons
│
├── hooks/
│   ├── useAuth.ts                 # Supabase session sync + redirect guards
│   ├── useChatInput.ts            # Controlled textarea (AI SDK v5)
│   ├── useJobPoller.ts            # Polling + optimistic job submission
│   ├── useQuota.ts                # Periodic quota refresh
│   └── useRetry.ts                # Exponential backoff wrapper
│
├── lib/
│   ├── api.ts                     # Typed fetch wrappers for all NestJS endpoints
│   ├── store.ts                   # Zustand auth store
│   ├── supabase.ts                # Browser Supabase client
│   └── utils.ts                   # cn, formatTokens, formatDate, etc.
│
├── types/index.ts                 # Shared TypeScript types (mirrors NestJS entities)
├── middleware.ts                  # Edge auth guard (Supabase SSR)
├── ARCHITECTURE.md                # Full architecture + scaling + cost docs
└── .env.example
```

---

## Quick Start

```bash
# 1. Clone and install
git clone <this-repo>
cd stream-ui
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   NEXT_PUBLIC_API_URL   (your NestJS server, e.g. http://localhost:3000)

# 3. Start NestJS backend first (from Stream-API repo)
cd ../Stream-API
npm run start:dev

# 4. Start Next.js (port 3001 to avoid conflict)
cd ../stream-ui
npm run dev -- -p 3001
```

Open [http://localhost:3001](http://localhost:3001).

---

## How Streaming Works

```
useChat (browser)
  ↓ POST /api/chat  { messages, conversationId }
Next.js route handler  (app/api/chat/route.ts)
  ↓ fetch with Bearer JWT  →  NestJS /chat/conversations/:id/stream
NestJS  →  Anthropic streaming SDK  →  SSE chunks
  ↑  pipes stream body back unchanged
Next.js  →  pipes to browser
  ↑  AI SDK parses SSE → React state → live UI updates
```

The `DefaultChatTransport` in `ChatWindow.tsx` injects the Supabase JWT
and `conversationId` on every request without any global fetch patching.

---

## Key Design Patterns

### AI SDK v5 input management

AI SDK v5 no longer manages the textarea value internally. The
`useChatInput` hook provides a fully controlled `<textarea>` that calls
`sendMessage({ text })` and clears itself after each submission.

### Optimistic UI for jobs

`useOptimisticJobs` immediately inserts a `waiting` job into the list
before the API call returns. On success it swaps the temp ID for the real
one; on failure it rolls back — giving instant feedback without a loading
spinner.

### Retry with backoff

`useRetry` wraps any async function with configurable exponential backoff.
It skips retries for client errors (4xx except 429) and exposes a
`nextRetryMs` countdown for the UI.

### Rate-limit countdown

`ChatErrorBanner` detects `429` responses and runs a countdown timer
sourced from the `Retry-After` header. The send button stays disabled
until the countdown expires.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Supabase anon public key |
| `NEXT_PUBLIC_API_URL` | ✓ | NestJS base URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | For admin operations |
| `NEXT_PUBLIC_APP_URL` | Optional | Used in email callbacks |

---

## Production Deployment

### Vercel (recommended for Next.js)
```bash
vercel --prod
# Add env vars in Vercel dashboard
# Set NEXT_PUBLIC_API_URL to your ECS ALB or API Gateway URL
```

### Docker / ECS
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3001
CMD ["node", "server.js"]
```

Set `output: 'standalone'` in `next.config.ts` for Docker builds.

---

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Full system design, cost analysis, scaling strategy, failure modes
- [Stream-API](https://github.com/remo-dif/Stream-API) — The NestJS backend
- [AI SDK Docs](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) — useChat reference
