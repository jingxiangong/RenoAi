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

## Pricing data and evidence

- **51 bundled jobs** with indicative SGD ranges and **49 separate review entries** with rejection or follow-up reasons. The source files for raw research are empty in this checkout, so the ranges are not independently traceable here.
- **Versioned inputs.** JSON supplies the bundled matcher and generates the Supabase seed migration. The local validator checks record shape, unique job codes, currency, and price ranges.
- **Reproducible checks.** Local example cases exercise matching, abstention, and known limitations. The evaluation includes a negated symptom that the current matcher incorrectly prices.

[Evaluation and limitations](docs/evaluation.md) · [Bundled jobs](data/pricing/price-knowledge-base.json) · [Review queue](data/pricing/price-needs-review.json)

## Run checks locally

Use Node.js 24, as pinned in [.nvmrc](.nvmrc). These checks run without OAuth, Supabase, or Qwen credentials.

```bash
npm ci
npm run lint
npm test
node scripts/validate-pricing.mjs
npm run evaluate:pricing
npm run build
```

To start the app, copy [.env.example](.env.example) to `.env.local`, set the appropriate values for your workflow, then run `npm run dev`. Use a generated local `AUTH_SECRET` and keep `.env.local` private.

| Workflow | Requirements |
| --- | --- |
| Review the product without an account | Use the [sample walkthrough](docs/walkthrough.md). |
| Run the signed-in text workflow | Configure Auth.js and a Google OAuth client, including the callback for the local origin. Set `AI_DEMO_MODE=true` for deterministic text-based analysis. |
| Run live photo-assisted analysis | Configure Qwen and set `AI_DEMO_MODE=false`. Live extraction sends photos and request context to the configured provider. |
| Persist records and attach media | Configure Supabase and apply the [migrations](supabase/migrations). Without Supabase, use text-only input and browser-local records. |

## Implementation status

- **Implemented** · Mobile workflow, structured analysis, editable brief, deterministic pricing, browser-local storage with optional Supabase sync, and a contractor-format print view.
- **Prototype limits** · Confirmation is a UI step. Video can be stored when Supabase is configured, and model extraction uses photos. The pricing matcher is primarily English and its matching score is separate from the model's self-reported repair confidence. Estimates are indicative and an on-site inspection can change the scope.
- **Optional tooling** · The [Daytona launcher](infra/daytona/README.md) needs the Daytona SDK and credentials. The [Nosana worker](infra/nosana/README.md) is a design for future video processing.

Built with Next.js, React, TypeScript, Zod, Qwen, Auth.js, and Supabase.
