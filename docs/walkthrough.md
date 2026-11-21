# Sample repair walkthrough

This credential-free walkthrough uses a synthetic report. The pricing result can be reproduced with the bundled catalog. The example brief and repair guidance illustrate the product flow.

## 1. Report the issue

> My bedroom door rubs against the floor and will not close properly.

Example property type is HDB. The homeowner can add photos in a configured app.

## 2. Review the extracted brief

| Field | Example |
| --- | --- |
| Location | Bedroom |
| Affected item | Door |
| Observed problem | Door rubbing floor and will not close properly |
| Condition | Unknown |
| Goal | Restore normal opening and closing |

If the location is missing, the app can ask where in the home the issue occurs. The homeowner can correct the door type or other details before continuing.

## 3. Assess the repair and look up a price

The assessment may suggest checking alignment and the hinges. The bundled catalog matches the phrase “door rubbing floor” to `DOOR_ALIGNMENT`, with an indicative range of **S$50–120**. The price range comes from the catalog. The result also supports a contractor-format print view.

If the description only says “something is wrong with the door,” the matcher has an item but lacks a corresponding symptom and returns **price unavailable**. If the report contains both a rubbing door and signs of hinge sagging, the matcher can also abstain when the candidate scores are close.

Run `npm test` for the matching and abstention checks or `npm run evaluate:pricing` to compare this case with the other examples.
