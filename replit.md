# Clarix Intelligence Platform

AI-curated intelligence briefings platform for curious professionals who want signal over noise.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/clarix run dev` — run the frontend (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, wouter, TanStack Query
- Fonts: Cormorant Garamond (display), Source Serif 4 (body), JetBrains Mono (labels/mono)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all contracts)
- `lib/db/src/schema/` — Drizzle ORM schema (articles.ts, users.ts, interactions.ts)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/clarix/src/` — React frontend (pages/, components/, hooks/)
- `lib/api-client-react/src/generated/` — Generated TanStack Query hooks
- `lib/api-zod/src/generated/` — Generated Zod validation schemas

## Architecture decisions

- Session-based upvotes/saves (IP/cookie-based, no auth required for interactions)
- JWT tokens stored in localStorage for auth; passed as `Authorization: Bearer <token>`
- Password hashing via SHA-256 + static salt (upgrade to bcrypt before production)
- Backend formats relative timestamps ("2h ago") to avoid timezone issues on client
- `impactLevel` uses a Postgres enum (high/medium/low); `subscriptionStatus` uses enum (trial/active/expired)

## Product

- **Intelligence Feed** — categorized article cards with AI sentiment tags, impact dots, and featured articles
- **Article Detail** — AI summary, "Why it matters", key facts, comments with upvoting
- **Categories** — World News, Geopolitics, Finance & Markets, Technology & AI, Psychology, Society & Culture, Deep Dives
- **User Auth** — Email/password signup with automatic 1-month free trial, sign in/out
- **Save & Upvote** — Session-based bookmarking and upvoting (no login required)
- **Newsletter** — Email subscription with duplicate prevention
- **Live Ticker** — Scrolling headlines from the DB
- **Theme Toggle** — Dark (default) / Light mode with localStorage persistence
- **Pricing Page** — Free trial vs paid subscription overview

## User preferences

- Premium dark-mode-first design matching the Clarix HTML prototype
- Keep everything from the original design: ticker, sidebar, stats, categories
- Subscription model: 1 month free trial on signup, then paid or access ends
- Payment gateway to be added later (Stripe)

## Security

- `ADMIN_TOKEN` **must** be set as a secret (via Replit Secrets / environment variables), never committed to `.replit` or source code. Set a strong, randomly-generated value before deploying. Without it in production the API server returns 503 on all admin routes.
- Feed URLs submitted through the admin console are validated server-side: only `http`/`https` protocols are accepted, private/loopback/link-local IPs and known cloud-metadata hostnames are blocked, and the resolved IP of the hostname is also checked to prevent DNS rebinding attacks.

## Gotchas

- Always run `pnpm run typecheck:libs` after changing DB schema before running API server typecheck
- After OpenAPI spec changes, run codegen before building frontend or type errors will cascade
- The `formatTimeAgo` function runs on the backend; frontend should display `article.publishedAt` as a string (not parse it as a Date)
- API server must be restarted after code changes (it bundles with esbuild)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
