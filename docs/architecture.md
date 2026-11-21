# RenoAI architecture

## Request lifecycle

1. The signed-in homeowner creates a property in `/onboarding` and starts a repair on `/home`. The composer stores the request in the browser. With Supabase configured, it obtains signed upload credentials and saves media references with the request.
2. `/repair/[requestId]/processing` calls `POST /api/problem-brief`. Live extraction sends request context and up to four compressed photos to Qwen. The clarification page collects answers and calls `POST /api/clarify`.
3. `/repair/[requestId]/review` allows edits. Continue starts `POST /api/analyse` with the edited brief. That route validates the problem schema and runs repair assessment and pricing concurrently. The current API trusts the client-supplied brief.
4. The result is stored in the browser as a `ProjectBrief`. The result page, request detail, and contractor-format view read the saved brief. Print controls open the browser's print dialog.

## Data boundaries

| Component | Responsibility |
| --- | --- |
| `src/features` | Mobile workflow, editable brief, result and contractor-format views |
| `src/schemas` | Zod schemas for core objects and model output |
| `src/server/ai` | Qwen-compatible API, prompts, structured parsing, deterministic demo behavior |
| `src/server/pipeline` | Repair assessment and pricing orchestration |
| `src/server/pricing` | Catalog lookup, phrase scoring, and abstention |
| `src/lib/local-store.ts` | Account-scoped browser cache and optional cloud sync |
| `supabase/migrations` | Record tables, access policies, storage bucket, and pricing seed |

## Persistence and security limitations

The browser cache is namespaced to the signed-in account. Legacy unscoped records are left in the browser and are excluded from automatic imports. The data API compares the request's cache scope with the current session to reject stale-tab sync after an account switch. Browser cache entries remain on the device after logout. The cache scope provides application-level separation within the browser.

Supabase record and media policies still rely on a server-derived owner value passed through a request header. Media references include long-lived signed URLs. A stronger verified-identity boundary and short-lived read URLs are separate hardening work. Use synthetic records for public screenshots and demos.

The pricing repository prefers configured Supabase rows and falls back to bundled JSON on load errors. Model failures surface as API errors and can prevent the final brief. Cloud sync is best-effort and errors currently appear in browser logs.
