import assert from "node:assert/strict";
import { test } from "node:test";
import { createLocalStore } from "../../src/features/account-data/store.ts";

function mockBrowser(context) {
  const cache = new Map();
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

  return cache;
}

test("two account scopes and the signed-out store never load each other's records", async (context) => {
  const cache = mockBrowser(context);
  context.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({}) }));
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


test("an earlier cloud pull preserves local edits and deletions made while it was in flight", async (context) => {
  const cache = mockBrowser(context);
  cache.set("renoai.account.first.requests", JSON.stringify([{ id: "edited", description: "old" }, { id: "deleted" }]));
  const incoming = Promise.withResolvers();
  const fetch = context.mock.method(globalThis, "fetch", async (_url, options) => (
    options.method ? { ok: true } : incoming.promise
  ));
  const store = createLocalStore("first");

  const sync = store.syncFromCloud();
  assert.equal(store.syncFromCloud(), sync);
  store.saveRequest({ id: "edited", description: "latest" });
  store.deleteRequest("deleted");
  incoming.resolve({
    ok: true,
    json: async () => ({
      requests: [{ id: "edited", description: "stale" }, { id: "deleted" }, { id: "cloud" }],
    }),
  });

  await sync;
  assert.deepEqual(store.requests(), [{ id: "cloud" }, { id: "edited", description: "latest" }]);
  await store.syncFromCloud();
  assert.equal(fetch.mock.calls.filter(({ arguments: [, options] }) => !options.method).length, 1);
});

test("updates to the same cloud record are sent in order", async (context) => {
  mockBrowser(context);
  const firstWrite = Promise.withResolvers();
  const secondStarted = Promise.withResolvers();
  const descriptions = [];
  context.mock.method(globalThis, "fetch", async (_url, options) => {
    const { data } = JSON.parse(options.body);
    descriptions.push(data.description);
    if (data.description === "first") return firstWrite.promise;
    if (data.description === "second") secondStarted.resolve();
    return { ok: true };
  });
  const store = createLocalStore("first");

  store.saveRequest({ id: "same", description: "first" });
  store.saveRequest({ id: "same", description: "second" });
  store.saveRequest({ id: "independent", description: "independent" });
  assert.deepEqual(descriptions, ["first", "independent"]);

  firstWrite.resolve({ ok: true });
  await secondStarted.promise;
  assert.deepEqual(descriptions, ["first", "independent", "second"]);
});
