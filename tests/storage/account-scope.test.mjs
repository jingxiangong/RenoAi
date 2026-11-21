import assert from "node:assert/strict";
import { test } from "node:test";
import { createLocalStore } from "../../src/lib/local-store.ts";

test("two account scopes and the signed-out store never load each other's records", async (context) => {
  const cache = new Map();
  context.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({}) }));
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: new EventTarget() },
    localStorage: {
      configurable: true,
      value: { getItem: (key) => cache.get(key), setItem: (key, value) => cache.set(key, value) },
    },
  });
  context.after(() => {
    delete globalThis.window;
    delete globalThis.localStorage;
  });

  cache.set("renoai.requests", JSON.stringify([{ id: "unattributed" }]));
  const first = createLocalStore("first");
  first.saveRequest({ id: "first-request" });

  const second = createLocalStore("second");
  assert.deepEqual(second.requests(), []);
  second.saveRequest({ id: "second-request" });
  assert.deepEqual(first.requests().map(({ id }) => id), ["first-request"]);
  assert.deepEqual(second.requests().map(({ id }) => id), ["second-request"]);
  assert.deepEqual(createLocalStore(null).requests(), []);

  await second.syncFromCloud();
  const requests = globalThis.fetch.mock.calls.map(({ arguments: [, options] }) => options);
  assert.deepEqual(requests.map(({ headers }) => headers["x-reno-cache-scope"]), ["first", "second", "second"]);
  assert.equal(requests.filter(({ method }) => method === "POST").length, 2);
});
