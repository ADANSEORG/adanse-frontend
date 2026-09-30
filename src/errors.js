/*
 * ---------------------------------------------------------
 * FRIENDLY ERROR MESSAGES
 * ---------------------------------------------------------
 *
 * Maps a thrown api.js error (see request()'s Error shape:
 * .status, .code, .details) to copy a researcher can act on,
 * instead of a raw backend message.
 *
 * `fallback` lets a caller supply a screen-specific message
 * for the catch-all case (e.g. "Could not load your credits."
 * on the Credits page) while still getting the same 401/402/
 * 409/insufficient-observations handling as everywhere else.
 */
export const CONNECTION_MESSAGE =
  "Adanse couldn't connect just now. Check your internet connection and try again.";

export const SERVER_MESSAGE =
  "Something went wrong on our side. Please try again in a moment.";

// A request that never got a response (api.js tags it status 0 /
// NETWORK_ERROR after its quiet retries), or a raw fetch() failure from a
// call that doesn't go through request().
function isConnectionFailure(e, m) {
  return (
    e?.status === 0 ||
    e?.code === "NETWORK_ERROR" ||
    /^(failed to fetch|load failed|networkerror when attempting to fetch resource\.?|network ?error)$/i.test(m.trim())
  );
}

const GENERIC_SERVER_TEXT =
  /^(internal server error|could not complete that request\.?|request failed \(\d+\)|the request could not be completed\.?)$/i;

const INTERNAL_DETAIL = /supabase|postgrest|traceback|configuration|exception/i;

const CODE_ERROR_NAMES = new Set(["TypeError", "ReferenceError", "SyntaxError", "RangeError"]);

function isTechnicalMessage(e, m) {
  const text = m.trim();
  if (GENERIC_SERVER_TEXT.test(text)) return true;
  if (Number(e?.status) >= 500 && INTERNAL_DETAIL.test(text)) return true;
  // Not from the API at all (no HTTP status): a bug in the app's own code.
  return e?.status === undefined && CODE_ERROR_NAMES.has(e?.name);
}

export function friendly(e, fallback) {
  const m = String(
    e?.message || ""
  );

  if (e?.status === 401) {
    return "Your session could not be verified. Please sign in again.";
  }

  if (
    e?.status === 402 ||
    e?.code ===
      "INSUFFICIENT_CREDITS"
  ) {
    const remaining =
      e?.details?.credits_remaining;

    const required =
      e?.details?.credits_required;

    if (
      remaining !== undefined &&
      required !== undefined
    ) {
      return (
        `You need ${required} credits for this operation, but you only have ${remaining} remaining. Please buy more credits to continue.`
      );
    }

    return (
      "You do not have enough credits for this operation. Please buy more credits to continue."
    );
  }

  if (e?.status === 409) {
    return (
      m ||
      "Review and activate the cleaned dataset before building the analysis plan."
    );
  }

  if (isConnectionFailure(e, m)) {
    return CONNECTION_MESSAGE;
  }

  // Never show a researcher raw technical text: a generic server failure
  // ("Could not complete that request", "Internal Server Error",
  // "Request failed (502)") or an error from the app's own code ("Cannot
  // read properties of undefined"). Specific, useful server messages --
  // e.g. the payment ones -- still come through below.
  if (isTechnicalMessage(e, m)) {
    return fallback || SERVER_MESSAGE;
  }

  if (
    /fewer than 2 observations|not enough observations|insufficient/i.test(
      m
    )
  ) {
    return (
      "One of the groups in your data has too few responses to run this test reliably.\n\n" +
      "Why? Statistical comparisons need enough observations in each group to estimate the difference reliably. " +
      "With too few responses, the result can be misleading or unstable."
    );
  }

  return (
    m ||
    fallback ||
    "We couldn't complete that step. Please try again."
  );
}
