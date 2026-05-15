# Objective
Run a production-focused security scan across Clarix, validate the most likely exploitable findings, and record only real vulnerabilities.

# Relevant information
- Production scope: `artifacts/api-server/**`, `artifacts/clarix/**`, `lib/**`, `.replit`, `replit.md`, `threat_model.md`
- Dev-only / out of scope unless proven reachable: `artifacts/mockup-sandbox/**`
- Tech stack: Express 5 API, React/Vite frontend, PostgreSQL via Drizzle
- Public surfaces: articles, explore/archive, comments, newsletter, stats, categories
- Auth surfaces: `/api/auth/*`, `/api/user/me`, bearer token handling in frontend
- Admin surfaces: `/api/admin/*`, admin console, ingestion scheduler, feed-source management
- Confirmed recon findings to validate: committed production `ADMIN_TOKEN`, unsigned bearer token format, static-salt SHA-256 password hashing

# Tasks

### T001: Validate user authentication and account security
- **Blocked By**: []
- **Details**:
  - Inspect `artifacts/api-server/src/routes/auth.ts`, frontend token handling, and any other bearer-token trust sites.
  - Determine whether tokens are forgeable, what data/actions they unlock in current production code, and whether login protections are missing.
  - Check existing vulnerabilities relevant to auth and update states if needed.
  - Acceptance: Confirmed auth/account findings have concrete exploit paths and severities.

### T002: Validate admin boundary and ingestion abuse paths
- **Blocked By**: []
- **Details**:
  - Inspect `.replit`, `artifacts/api-server/src/routes/admin.ts`, `artifacts/api-server/src/ingestion/index.ts`, and `artifacts/clarix/src/pages/admin.tsx`.
  - Determine whether admin secrets are exposed, whether admin auth is strong enough for production, and what an attacker can do after bypass/compromise.
  - Check existing vulnerabilities relevant to admin/ingestion and update states if needed.
  - Acceptance: Confirmed admin findings include the exact reachable admin actions and resulting impact.

### T003: Sweep public endpoints for independent security bugs
- **Blocked By**: []
- **Details**:
  - Inspect public routes (`articles.ts`, `comments.ts`, `explore.ts`, `newsletter.ts`, `stats.ts`, `categories.ts`) for auth bypass, data leakage, injection, SSRF, or abuse paths that do not depend on already-known admin compromise.
  - Check existing vulnerabilities relevant to public routes and update states if needed.
  - Acceptance: Either confirm additional independent vulnerabilities or rule them out briefly with evidence.
