// U-tests. No real localStorage exists under plain Node, so each test installs
// its own fake on globalThis.localStorage and restores whatever was there
// (undefined, normally) afterwards -- see lastVisited.js's storage() note on
// why it reads globalThis rather than window.
import test from "node:test";
import assert from "node:assert/strict";

import {
  clearLastVisited,
  getLastVisited,
  setLastVisited,
} from "./lastVisited.js";

const UUID_A = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const UUID_B = "9c858901-8a57-4791-81fe-4c455b099bc9";

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    _data: data,
  };
}

function withStorage(store, fn) {
  const had = "localStorage" in globalThis;
  const prior = globalThis.localStorage;
  globalThis.localStorage = store;
  try {
    fn();
  } finally {
    if (had) globalThis.localStorage = prior;
    else delete globalThis.localStorage;
  }
}

test("round-trips a project id and step for a user", () => {
  withStorage(fakeStorage(), () => {
    setLastVisited("u1", UUID_A, "analysis");
    assert.deepEqual(getLastVisited("u1"), { projectId: UUID_A, step: "analysis" });
  });
});

test("two users never see each other's last-visited project", () => {
  withStorage(fakeStorage(), () => {
    setLastVisited("u1", UUID_A, "setup");
    setLastVisited("u2", UUID_B, "chapter4");
    assert.deepEqual(getLastVisited("u1"), { projectId: UUID_A, step: "setup" });
    assert.deepEqual(getLastVisited("u2"), { projectId: UUID_B, step: "chapter4" });
  });
});

test("no user, or a user who has never visited, gets null", () => {
  withStorage(fakeStorage(), () => {
    assert.equal(getLastVisited("nobody"), null);
    for (const bad of [null, undefined, ""]) assert.equal(getLastVisited(bad), null);
  });
});

test("clearing removes exactly that user's entry", () => {
  withStorage(fakeStorage(), () => {
    setLastVisited("u1", UUID_A, "setup");
    setLastVisited("u2", UUID_B, "review");
    clearLastVisited("u1");
    assert.equal(getLastVisited("u1"), null);
    assert.deepEqual(getLastVisited("u2"), { projectId: UUID_B, step: "review" });
  });
});

test("setLastVisited silently does nothing for a bad id, a bad step, or no user (never stores garbage)", () => {
  const store = fakeStorage();
  withStorage(store, () => {
    setLastVisited("u1", "not-a-uuid", "setup");
    setLastVisited("u1", UUID_A, "workspace"); // old internal step name, not a route step
    setLastVisited(null, UUID_A, "setup");
    setLastVisited("u1", UUID_A, null);
  });
  assert.deepEqual(store._data, {});
});

test("a corrupted stored value is treated as none, not thrown", () => {
  withStorage(fakeStorage({ "adanse:lastVisited:u1": "{not json" }), () => {
    assert.equal(getLastVisited("u1"), null);
  });
  withStorage(fakeStorage({ "adanse:lastVisited:u1": JSON.stringify({ projectId: "not-a-uuid", step: "setup" }) }), () => {
    assert.equal(getLastVisited("u1"), null);
  });
  withStorage(fakeStorage({ "adanse:lastVisited:u1": JSON.stringify({ projectId: UUID_A, step: "made-up" }) }), () => {
    assert.equal(getLastVisited("u1"), null);
  });
  withStorage(fakeStorage({ "adanse:lastVisited:u1": JSON.stringify(null) }), () => {
    assert.equal(getLastVisited("u1"), null);
  });
  withStorage(fakeStorage({ "adanse:lastVisited:u1": JSON.stringify("just a string") }), () => {
    assert.equal(getLastVisited("u1"), null);
  });
});

test("a storage that throws (private browsing, quota, disabled) degrades to null / no-op, never throws", () => {
  const angry = {
    getItem() { throw new Error("SecurityError"); },
    setItem() { throw new Error("QuotaExceededError"); },
    removeItem() { throw new Error("SecurityError"); },
  };
  withStorage(angry, () => {
    assert.doesNotThrow(() => assert.equal(getLastVisited("u1"), null));
    assert.doesNotThrow(() => setLastVisited("u1", UUID_A, "setup"));
    assert.doesNotThrow(() => clearLastVisited("u1"));
  });
});

test("no localStorage global at all (e.g. this test file's own default environment) degrades the same way", () => {
  const had = "localStorage" in globalThis;
  const prior = globalThis.localStorage;
  delete globalThis.localStorage;
  try {
    assert.doesNotThrow(() => assert.equal(getLastVisited("u1"), null));
    assert.doesNotThrow(() => setLastVisited("u1", UUID_A, "setup"));
    assert.doesNotThrow(() => clearLastVisited("u1"));
  } finally {
    if (had) globalThis.localStorage = prior;
  }
});

test("each user's key is namespaced so it can't collide with an unrelated key", () => {
  const store = fakeStorage({ u1: "not ours" }); // a bare "u1" key some other code might use
  withStorage(store, () => {
    setLastVisited("u1", UUID_A, "setup");
    assert.deepEqual(getLastVisited("u1"), { projectId: UUID_A, step: "setup" });
  });
  assert.equal(store._data.u1, "not ours"); // untouched
  assert.ok("adanse:lastVisited:u1" in store._data);
});
