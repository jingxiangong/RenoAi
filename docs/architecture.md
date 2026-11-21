# RenoAI architecture

## Request lifecycle

1. The signed-in homeowner creates a property in `/onboarding` and starts a repair on `/home`. The composer stores the request in the browser. With Supabase configured, it obtains signed upload credentials and saves media references with the request.
2. `/repair/[requestId]/processing` calls `POST /api/problem-brief`. Live extraction sends request context and up to two compressed photos to Qwen. The clarification page collects answers and calls `POST /api/clarify`.
3. `/repair/[requestId]/review` allows edits. Continue starts `POST /api/analyse` with the edited brief. That route validates the problem schema and runs repair assessment and pricing concurrently. The current API trusts the client-supplied brief.
4. The result is stored in the browser as a `ProjectBrief`. The result page, request detail, and contractor-format view read the saved brief. Print controls open the browser's print dialog.

## Data boundaries

| Component | Responsibility |
| --- | --- |
| `src/app` | Next.js page and API entry points |
| `src/features/repair` | Repair input, brief review, processing, and result views |
| `src/features/onboarding`, `src/features/requests` | Property onboarding and saved request history |
| `src/features/account-data` | Account-scoped browser cache and cloud sync |
| `src/schemas` | Zod schemas for core objects and model output |
| `src/server/account-data` | Supabase access to records for the current account |
| `src/server/storage` | Evidence upload and signed read links |
| `src/server/ai` | Qwen-compatible API, prompts, provider response parsing, and call limits |
| `src/server/repair` | Repair workflow contracts, orchestration, and deterministic demo behavior |
| `src/server/pricing` | Catalog lookup, phrase scoring, and abstention |
| `supabase/migrations` | Record tables, access policies, storage bucket, pricing seed, and AI call reservations |

## Persistence and security limitations

The browser cache is namespaced to the signed-in account. Legacy unscoped records are left in the browser and are excluded from automatic imports. The data API compares the request's cache scope with the current session to reject stale-tab sync after an account switch. Browser cache entries remain on the device after logout. The cache scope provides application-level separation within the browser.

Supabase record and media policies still rely on a server-derived owner value passed through a request header. Media references include long-lived signed URLs. A stronger verified-identity boundary and short-lived read URLs are separate hardening work. Use synthetic records for public screenshots and demos.

The pricing repository prefers configured Supabase rows and falls back to bundled JSON on load errors. Model failures surface as API errors and can prevent the final brief. The initial cloud read preserves local edits and deletions made before it completes. Updates to the same record are sent in order. Cloud sync is best-effort and failures appear in browser logs.
