# Stream-UI — Fixes Applied

## 🔴 Critical

### 1. JWT no longer persisted to localStorage (`lib/store.ts`)
**Problem:** `useAuthStore` used Zustand's `persist()` middleware with `partialize: state => ({ token: state.token })`, writing the Supabase JWT to `localStorage` under key `"stream-ui-auth"`. Any XSS payload could read and exfiltrate every user's bearer token.

**Fix:** Removed `persist()` entirely. The store is now in-memory only. On mount, `useAuthInit` re-hydrates the token from the Supabase session cookie (httpOnly, JS-inaccessible) via `supabase.auth.getSession()`. The middleware already validates sessions on every server-side navigation.

### 2. All API paths now include `/api/v1` prefix (`lib/api.ts`)
**Problem:** Every path in `apiFetch` calls was missing the `/api/v1` prefix that NestJS controllers use (`@Controller('api/v1/...')`). Every API call would 404 in production.

Additionally:
- `authApi.me` called `GET /auth/me` — the actual NestJS endpoint is `GET /api/v1/auth/user`
- `chatApi.streamUrl` generated `/chat/conversations/:id/stream` — the SSE endpoint is `POST /api/v1/chat/conversations/:id/messages`
- `authApi.signIn/signUp` used kebab-case paths; NestJS uses camelCase (`/signin`, `/signup`)

**Fix:** All paths corrected to match NestJS routes. Added missing endpoints (`signOut`, `refresh`, `getMessages`).

## 🔴 Security

### 3. `SUPABASE_SERVICE_ROLE_KEY` removed from UI env (`env.example`)
**Problem:** The service role key was listed in the UI's `.env.example`. It has no business being in the frontend repo and its presence suggests (or encourages) calling Supabase admin APIs from Next.js.

**Fix:** Removed from `.env.example`. The service role key belongs exclusively in `Stream-API`.
