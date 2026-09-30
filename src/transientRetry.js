/*
 * ---------------------------------------------------------
 * QUIET RETRIES FOR TRANSIENT FAILURES
 * ---------------------------------------------------------
 *
 * A dropped connection ("Failed to fetch") or a momentary server error
 * (500/502/503/504 -- e.g. the API waking up, or a blip between the API
 * and the database) used to be shown to the researcher straight away,
 * usually right after signing in. Read requests (GET) are now retried a
 * few times, with growing waits, before any error is shown. Writes are
 * never retried automatically: a save, upload or payment must not run
 * twice.
 */

export const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];

const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);

export function isRetryableMethod(method) {
  return String(method || "GET").toUpperCase() === "GET";
}

export function isTransientStatus(status) {
  return TRANSIENT_STATUSES.has(Number(status));
}

// fetch() rejects with a TypeError when the request never got a response:
// "Failed to fetch" (Chrome), "NetworkError when attempting to fetch
// resource." (Firefox), "Load failed" (Safari).
export function isNetworkError(error) {
  return error instanceof TypeError || error?.name === "TypeError";
}

/*
 * Run `attempt` (which returns a fetch Response or throws), retrying while
 * the failure is transient and the method may be retried. Returns the last
 * Response; rethrows the last network error once retries are used up.
 */
export async function fetchWithRetry(
  attempt,
  { method = "GET", delays = RETRY_DELAYS_MS, sleep = defaultSleep } = {}
) {
  const retryable = isRetryableMethod(method);

  for (let i = 0; ; i += 1) {
    const canRetry = retryable && i < delays.length;

    try {
      const response = await attempt();

      if (canRetry && isTransientStatus(response?.status)) {
        await sleep(delays[i]);
        continue;
      }

      return response;
    } catch (error) {
      if (canRetry && isNetworkError(error)) {
        await sleep(delays[i]);
        continue;
      }

      throw error;
    }
  }
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
