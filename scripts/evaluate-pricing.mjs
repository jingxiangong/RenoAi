import { readFileSync } from "node:fs";
import { matchPriceRow } from "../src/server/pricing/matcher.ts";

const rows = JSON.parse(readFileSync(new URL("../data/pricing/price-knowledge-base.json", import.meta.url)));
const cases = JSON.parse(readFileSync(new URL("../tests/pricing/evaluation-cases.json", import.meta.url)));

const results = cases.map(({ id, item, symptom, expected }) => {
  const brief = { affected_item: item, observed_problem: symptom, dynamic_details: {} };
  const actual = matchPriceRow(brief, rows)?.job_code ?? null;
  return { id, expected, actual, correct: actual === expected };
});

console.table(results);
const priced = results.filter(({ actual }) => actual !== null);
const noPriceExpected = results.filter(({ expected }) => expected === null);
const correctPrices = priced.filter(({ correct }) => correct);
const falsePrices = noPriceExpected.filter(({ actual }) => actual !== null);
console.log(`Priced cases: ${priced.length}/${results.length}`);
console.log(`Correct job among priced cases: ${correctPrices.length}/${priced.length}`);
console.log(`False prices among cases labeled unavailable: ${falsePrices.length}/${noPriceExpected.length}`);
