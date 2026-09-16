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
