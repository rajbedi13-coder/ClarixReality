# Threat Model

## Project Overview

Clarix is a pnpm-workspace application with a React/Vite frontend (`artifacts/clarix`) and an Express 5 API server (`artifacts/api-server`) backed by PostgreSQL via Drizzle. It serves public article browsing, anonymous saves/upvotes, newsletter signup, comments, email/password account creation, and an admin-only editorial/ingestion console. In production, traffic is TLS-terminated by the platform; mockup sandbox code is not deployed and is out of scope.

## Assets

- **Admin control plane** — the admin token, admin-only routes, source-management actions, and ingestion controls. Compromise lets an attacker publish/reject/delete articles, alter sources, and trigger server-side fetches.
- **User accounts and identities** — user email addresses, password hashes, trial/subscription state, and any bearer tokens used to identify users.
- **Editorial content and moderation state** — pending/approved/rejected articles, comments, and ticker items. Unauthorized changes affect platform integrity and trust.
- **Behavioral interaction data** — saved articles, upvotes, comment votes, and newsletter subscriptions. Even when anonymous, this data can reveal user interests or be tampered with.
- **Infrastructure secrets** — `DATABASE_URL`, `ADMIN_TOKEN`, and any future provider secrets used by ingestion or AI summarization.

## Trust Boundaries

- **Browser to API** — all frontend requests cross into an untrusted boundary; every parameter, header, cookie, and body field must be validated server-side.
- **Public to admin** — `/api/admin/*` is a critical privilege boundary; only authorized operators should be able to mutate content, manage sources, or start ingestion.
- **API to database** — the API has direct read/write access to article, comment, user, source, and interaction tables.
- **API to external feeds** — ingestion fetches RSS feeds from URLs stored in the database. Feed content and feed endpoints are untrusted.
- **Development to production** — `artifacts/mockup-sandbox` is dev-only and should usually be ignored unless proven reachable in production.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/clarix/src/main.tsx`, `artifacts/clarix/src/App.tsx`
- **Highest-risk code areas:** `artifacts/api-server/src/routes/auth.ts`, `artifacts/api-server/src/routes/admin.ts`, `artifacts/api-server/src/routes/articles.ts`, `artifacts/api-server/src/routes/comments.ts`, `artifacts/api-server/src/routes/explore.ts`, `artifacts/api-server/src/ingestion/index.ts`, `.replit`
- **Public surfaces:** article, archive, explore, comments, newsletter, stats, categories routes
- **Authenticated surfaces:** `/api/auth/*`, `/api/user/me` and frontend token handling in `artifacts/clarix/src/pages/signin.tsx` / `signup.tsx`
- **Admin surfaces:** `/api/admin/*` and `artifacts/clarix/src/pages/admin.tsx`
- **Dev-only surfaces:** `artifacts/mockup-sandbox/**`

## Threat Categories

### Spoofing

Clarix currently uses a bearer-token-based user flow and a separate admin header token. The application must ensure user tokens are cryptographically verifiable, expire appropriately, and cannot be forged by clients. Admin access must not depend on secrets that are committed to source control or easily replayed from a browser-stored value.

Anonymous interaction identity is also a trust boundary here: saved items and upvotes currently depend on a session identifier derived from client-controlled headers/cookies. Public engagement state must not rely on values the client can mint or spoof freely.

### Tampering

Public users can send query strings, comment bodies, newsletter emails, and anonymous interaction identifiers; admins can mutate articles and ingestion sources. The server must validate and constrain all mutable fields, and admin-only mutations must remain unreachable to unauthenticated users. Server-side fetch targets for ingestion must be treated as high-risk inputs because they can redirect server traffic.

### Information Disclosure

The API stores user emails, password hashes, subscription state, newsletter subscriptions, and anonymous interaction data. Protected user endpoints must not disclose another user's profile based on client-supplied identifiers or forgeable tokens. Logs, API errors, and committed configuration must not expose production secrets.

### Denial of Service

Public endpoints include sign-in, signup, comments, article listing/search, and newsletter subscription. The application must bound expensive queries and protect authentication or moderation-relevant endpoints against brute force and automation. Ingestion must use timeouts and avoid letting attackers trigger unbounded external fetches.

### Elevation of Privilege

The highest-risk escalation path is from public user to admin control of editorial and ingestion workflows. Admin routes must enforce strong server-side authorization, and any secret granting that access must be unique per deployment and kept outside version control. Any token or session mechanism trusted by `/api/user/me` or future protected endpoints must resist client-side forgery.