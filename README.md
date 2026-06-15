# Stream UI

Next.js frontend for the Stream AI workspace.

This app provides:
- login and session handling with Supabase
- chat conversations and streaming responses
- usage dashboard
- async jobs UI
- admin UI
- settings UI
- a responsive authenticated app shell

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Zustand
- Supabase SSR
- Recharts
- AI SDK / streaming UI helpers

## Works With

This frontend is designed to run against the `Stream-API` NestJS backend.

Expected local URLs:
- frontend: `http://localhost:3001`
- backend: `http://localhost:3000`

## Project Structure

```text
app/
  api/chat/route.ts         backend streaming proxy
  login/                    auth page
  chat/                     chat landing and conversation routes
  dashboard/                usage dashboard
  jobs/                     async jobs
  admin/                    admin pages
  settings/                 settings pages

components/
  AppShell.tsx              responsive authenticated shell
  AppSidebar.tsx            navigation, conversations, quota, account controls
  QuotaIndicator.tsx
  chat/                     chat UI pieces

hooks/
  useAuth.ts

lib/
  api.ts                    typed backend calls
  store.ts                  auth state
  supabase.ts
  utils.ts
```

## Environment

Copy `.env.example` to `.env`.

Typical values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the backend first from the backend repo:

```bash
npm run start:dev
```

Then run the frontend from this repo:

```bash
npm run dev
```

Open:

```text
http://localhost:3001
```

## Production Commands

Build:

```bash
npm run build
```

Start:

```bash
npm run start
```

Type check:

```bash
npm run type-check
```

Lint:

```bash
npm run lint
```

## Auth Flow

- Supabase manages browser auth/session
- middleware protects non-public routes
- the client hydrates auth state from Supabase
- the frontend calls the Nest backend for `/auth/user` and tenant-aware data

## UI Notes

Recent UI work includes:
- a reusable mobile-friendly `AppShell`
- improved sidebar behavior on mobile and desktop
- better login UX with clearer validation and feedback
- a more responsive dashboard layout
- cleaner shared Tailwind utility patterns in `app/globals.css`

## Streaming Flow

```text
Browser chat UI
  -> Next.js route handler
    -> NestJS SSE endpoint
      -> provider-backed LLM response stream
```

The frontend does not call the model provider directly. It talks to the backend.

## Verification

Verified recently:
- `npm run build` passes
- `npm run type-check` passes

If `type-check` fails because of missing `.next/types`, run `npm run build` first so Next regenerates them.

## Current Status

The app is aligned with the current backend routes and contracts for:
- login
- chat shell and conversation flow
- dashboard
- jobs
- admin
- settings

Live AI replies still depend on the backend having a valid funded provider key configured.
