import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { matchPriceRow } from "../../src/server/pricing/matcher.ts";

const rows = JSON.parse(readFileSync(new URL("../../data/pricing/price-knowledge-base.json", import.meta.url)));

function match(affected_item, observed_problem) {
  return matchPriceRow({ affected_item, observed_problem, dynamic_details: {} }, rows);
}

test("a specific door symptom retrieves the bundled SGD range", () => {
  const row = match("door", "door rubbing floor");
  assert.equal(row?.job_code, "DOOR_ALIGNMENT");
  assert.deepEqual([row.estimated_min_price, row.estimated_max_price, row.currency], [50, 120, "SGD"]);
});

test("the matcher requires both item and symptom evidence", () => {
  assert.equal(match("door", "problem unknown"), undefined);
  assert.equal(match("window", "door rubbing floor"), undefined);
});

test("the matcher abstains on close competing jobs", () => {
  assert.equal(match("door", "door sagging from hinge and door rubbing floor"), undefined);
});
