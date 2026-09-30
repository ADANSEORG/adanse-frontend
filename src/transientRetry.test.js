import test from "node:test";
import assert from "node:assert/strict";

import {
  RETRY_DELAYS_MS,
  fetchWithRetry,
  isNetworkError,
  isTransientStatus,
} from "./transientRetry.js";

const response = (status) => ({ status });
const networkFailure = () => new TypeError("Failed to fetch");

// Plays back a script of outcomes (a status number, or an Error to throw).
function scripted(outcomes) {
  const calls = { count: 0 };
  const attempt = async () => {
    const next = outcomes[Math.min(calls.count, outcomes.length - 1)];
    calls.count += 1;
    if (next instanceof Error) throw next;
    return response(next);
  };
  return { attempt, calls };
}

function recordingSleep() {
  const waits = [];
  return { waits, sleep: async (ms) => { waits.push(ms); } };
}

test("a GET that hits a momentary server error is retried quietly and succeeds", async () => {
  const { attempt, calls } = scripted([500, 503, 200]);
  const { waits, sleep } = recordingSleep();
  const result = await fetchWithRetry(attempt, { method: "GET", sleep });
  assert.equal(result.status, 200);
  assert.equal(calls.count, 3);
  assert.deepEqual(waits, RETRY_DELAYS_MS.slice(0, 2));
});

test("a GET whose connection drops ('Failed to fetch') is retried quietly and succeeds", async () => {
  const { attempt, calls } = scripted([networkFailure(), networkFailure(), 200]);
  const { sleep } = recordingSleep();
  const result = await fetchWithRetry(attempt, { method: "GET", sleep });
  assert.equal(result.status, 200);
  assert.equal(calls.count, 3);
});

test("writes are never retried: a save, upload or payment must not run twice", async () => {
  for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
    const server = scripted([503, 200]);
    const serverResult = await fetchWithRetry(server.attempt, { method, sleep: async () => {} });
    assert.equal(serverResult.status, 503, method);
    assert.equal(server.calls.count, 1, method);

    const network = scripted([networkFailure(), 200]);
    await assert.rejects(fetchWithRetry(network.attempt, { method, sleep: async () => {} }), TypeError);
    assert.equal(network.calls.count, 1, method);
  }
});

test("after the last retry the failure is handed back, not retried forever", async () => {
  const server = scripted([502]);
  const { waits, sleep } = recordingSleep();
  const result = await fetchWithRetry(server.attempt, { method: "GET", sleep });
  assert.equal(result.status, 502);
  assert.equal(server.calls.count, RETRY_DELAYS_MS.length + 1);
  assert.deepEqual(waits, RETRY_DELAYS_MS);

  const network = scripted([networkFailure()]);
  await assert.rejects(fetchWithRetry(network.attempt, { method: "GET", sleep: async () => {} }), TypeError);
  assert.equal(network.calls.count, RETRY_DELAYS_MS.length + 1);
});

test("answers that aren't transient are returned at once", async () => {
  for (const status of [200, 400, 401, 402, 403, 404, 409, 413, 422, 429]) {
    const { attempt, calls } = scripted([status, 200]);
    const result = await fetchWithRetry(attempt, { method: "GET", sleep: async () => {} });
    assert.equal(result.status, status);
    assert.equal(calls.count, 1, String(status));
  }
});

test("errors from the app's own code are not mistaken for dropped connections", async () => {
  const { attempt, calls } = scripted([new RangeError("bad"), 200]);
  await assert.rejects(fetchWithRetry(attempt, { method: "GET", sleep: async () => {} }), RangeError);
  assert.equal(calls.count, 1);
  assert.equal(isNetworkError(new TypeError("Failed to fetch")), true);
  assert.equal(isTransientStatus(504), true);
  assert.equal(isTransientStatus(501), false);
});
