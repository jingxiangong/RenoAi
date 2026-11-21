# RenoAI

**AI-assisted repair triage for Singapore homes.** RenoAI turns a description and optional photos into an editable repair brief. A separate pricing engine looks up an indicative SGD range and abstains when the evidence is insufficient or the match is ambiguous.

[Walk through a sample repair](docs/walkthrough.md) · [Explore the architecture](docs/architecture.md) · [Reproduce the pricing evaluation](docs/evaluation.md)

## How it works

1. A homeowner describes a repair and can add photos or an issue category.
2. Qwen extracts a structured brief and identifies missing details. The homeowner answers clarification questions and can revise the brief before continuing.
3. The server runs repair assessment and rule-based pricing in parallel. The pricing engine requires both an affected-item match and a symptom match. Close competing jobs return an unavailable estimate.
4. The result is saved as a shared data object for the homeowner and contractor-format views. Both support browser print-to-PDF.

```text
Description + photos
        ↓
Structured brief → Clarification → Homeowner review
                                      ↓
                  Repair assessment + Catalog match or abstention
                                      ↓
                           Project brief and print views
```

## Run locally

Use Node.js 24 and run the following from the repository root. On first setup, copy `.env.example` to `.env.local`. If you already have a `.env.local`, keep it and add any missing settings. [.nvmrc](.nvmrc) · [.env.example](.env.example)

```bash
npm ci
```

### Start with the text demo

1. Run `node -p "require('node:crypto').randomBytes(32).toString('hex')"` and set the result as `AUTH_SECRET` in `.env.local`.
2. Create a Google OAuth **Web application** client. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI and fill in `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. Register the callback for the origin you open in the browser. If the Google app is in testing mode, add your account as a test user. [Google OAuth credentials](https://console.cloud.google.com/apis/credentials)
3. Keep `AI_DEMO_MODE=true`, run `npm run dev`, and open `http://localhost:3000`. Sign in, add a home, and submit a text repair. [Sample walkthrough](docs/walkthrough.md)

The text demo uses deterministic analysis and the bundled pricing catalog with no Supabase or Qwen credentials. Keep `.env.local` out of Git. Restart the dev server after changing its values.

### Enable photos and cloud records

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the same Supabase project. Apply the storage migration for records and photo uploads. Apply the pricing migration if you want Supabase to serve the pricing catalog. [Storage migration](supabase/migrations/202608290001_renoai_storage.sql) · [Pricing migration](supabase/migrations/202608290002_price_knowledge.sql)

Use the attachment picker or paste a screenshot into the repair description. Each repair accepts up to two removable photos.

### Enable live AI

1. Set `AI_DEMO_MODE=false` and provide `QWEN_API_KEY`. Match `QWEN_BASE_URL` to the OpenAI-compatible endpoint for the key's region. The template uses the Singapore endpoint, and the server appends `/chat/completions`. [Model Studio endpoints](https://www.alibabacloud.com/help/en/model-studio/base-url)
2. Apply the quota migration in the Supabase project at `NEXT_PUBLIC_SUPABASE_URL`. Set its service-role key as `SUPABASE_SERVICE_ROLE_KEY` in the server environment. [Quota migration](supabase/migrations/202608290003_qwen_quota.sql)
3. Use the default `qwen3-vl-flash` model or set `QWEN_MODEL` to a vision-capable model available to your key. Optionally set `QWEN_REPAIR_MODEL` for the final text assessment.

Live extraction sends the description, property type and ID, and up to two compressed photos to Qwen. The server reserves each call in Supabase before sending it. The limit is three calls per repair, with up to two calls before final analysis and at most one clarification round. Reserved failed calls and retries count toward the limit.

Daily caps default to 12 calls per account and 120 for the site, resetting at midnight UTC. Configure them with `QWEN_ACCOUNT_DAILY_LIMIT` and `QWEN_SITE_DAILY_LIMIT`. Model output is capped at 1,200 tokens per call. Actual charges depend on the model and provider pricing.

| If you see | Check |
| --- | --- |
| Unable to prepare upload | Confirm both `NEXT_PUBLIC_SUPABASE_*` values and apply the storage migration in that project. |
| Usage limits could not be checked | Confirm `SUPABASE_SERVICE_ROLE_KEY` belongs to the project at `NEXT_PUBLIC_SUPABASE_URL` and apply the quota migration. |
| Qwen denied access (HTTP 401 or 403) | Check the API key, endpoint region, and access to the configured model in Model Studio. |

## Pricing data and evidence

- **51 bundled jobs** with indicative SGD ranges and **49 separate review entries** with rejection or follow-up reasons. The repository includes the bundled catalog and review notes. It has no raw research sources to independently trace the ranges.
- **Versioned inputs.** JSON supplies the bundled matcher and generates the Supabase seed migration. The local validator checks record shape, unique job codes, currency, and price ranges.
- **Reproducible checks.** Local example cases exercise matching, abstention, and known limitations. The evaluation includes a negated symptom that the current matcher incorrectly prices.

[Evaluation and limitations](docs/evaluation.md) · [Bundled jobs](data/pricing/price-knowledge-base.json) · [Review queue](data/pricing/price-needs-review.json)

## Run checks locally

After installing dependencies, run these checks without OAuth, Supabase, or Qwen credentials.

```bash
npm run lint
npm test
node scripts/validate-pricing.mjs
npm run evaluate:pricing
npm run build
```

## Current limits

- Confirmation is a UI step.
- Supabase can store supported video attachments. Model extraction uses photos.
- The pricing matcher is primarily English. The matching score and the model's repair confidence measure different things.
- Estimates are indicative. An on-site inspection can change the scope.

Built with Next.js, React, TypeScript, Zod, Qwen, Auth.js, and Supabase.
