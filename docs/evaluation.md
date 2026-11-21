# Pricing evaluation

Run `npm run evaluate:pricing` on Node.js 24. It evaluates the production matcher with the bundled JSON catalog and eight hand-labeled synthetic cases. The script prints each expected and actual job code. It treats a null job as an abstention and reports known mismatches without failing the command. Behavior protected by regression tests is checked separately with `npm test`.

| Measure | Result on the example set |
| --- | ---: |
| Cases receiving a price | 3 / 8 |
| Correct job among priced cases | 2 / 3 |
| Cases priced despite an unavailable label | 1 / 6 |

The false price is for “door is not sticking.” Token overlap can match the negated symptom to a positive keyword. The example uses an English affected-item label and a Chinese symptom to exercise one limitation of the current ASCII normalization. The result describes this example set only. The cases are hand-built and the evaluation does not check market price accuracy, real-world coverage, multilingual performance, or Qwen output quality.

## Catalog provenance

The repository versions 51 price rows and a review queue of 49 entries. The queue documents examples of inconsistent scope, missing upper bounds, and mixed labor-only and all-in prices. Raw research sources are outside this repository. Before claiming market coverage or benchmark quality, attach permission-cleared sources and document collection dates, unit of work, inclusion rules, and reviewer decisions.
