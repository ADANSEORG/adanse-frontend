import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { verifyCreditPayment } from "../api.js";
import { friendly } from "../errors.js";

/*
 * ---------------------------------------------------------
 * PaymentCallback
 * ---------------------------------------------------------
 *
 * The only page in the app reached by a real URL instead of
 * the in-memory `step` state in useThesisWorkflow. Paystack
 * does a full top-level redirect back to this route after
 * checkout, which reloads the SPA from scratch -- nothing
 * about prior app state (step, active conversation, etc.)
 * survives that round trip, so this page is self-contained
 * and only knows how to verify a payment and hand the user
 * back to "/".
 */
export default function PaymentCallback() {
  const [searchParams] = useSearchParams();

  const reference =
    searchParams.get("reference") ||
    searchParams.get("trxref") ||
    "";

  const [status, setStatus] = useState(
    reference ? "verifying" : "missing-reference"
  );

  const [message, setMessage] = useState("");
  const [credits, setCredits] = useState(null);

  /*
   * ---------------------------------------------------------
   * VERIFY
   * ---------------------------------------------------------
   */

  const runVerify = useCallback(async () => {
    setStatus("verifying");
    setMessage("");

    try {
      const result = await verifyCreditPayment(reference);

      if (result?.status === "success") {
        setCredits(
          typeof result?.credits === "number"
            ? result.credits
            : null
        );

        setStatus("success");

        /*
         * Drop the spent reference from the URL so a refresh
         * or bookmark doesn't re-submit it.
         */
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        return;
      }

      /*
       * The backend only ever returns a success body or throws
       * -- this branch is defensive in case that ever changes
       * (e.g. a pending/queued status added later).
       */
      setStatus("pending");
      setMessage(
        "Paystack has not confirmed this payment yet. It may still be processing."
      );
    } catch (e) {
      if (e?.status === undefined) {
        /*
         * request() throws a plain Error with no .status when
         * fetch() itself fails (backend unreachable, timeout,
         * offline) -- distinct from an HTTP error response.
         */
        setStatus("network-error");
        setMessage(
          "We couldn't reach the Adanse server. Check your connection and try again."
        );
      } else {
        setStatus("error");
        setMessage(
          friendly(e, "We could not verify your payment.")
        );
      }
    }
  }, [reference]);

  useEffect(() => {
    if (!reference) return;
    runVerify();
  }, [reference, runVerify]);

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  const isRetryable =
    status === "error" ||
    status === "network-error" ||
    status === "pending";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div className="section-kicker">
          PAYSTACK PAYMENT
        </div>

        {status === "missing-reference" && (
          <>
            <h1 style={styles.title}>
              Invalid payment link.
            </h1>

            <p style={styles.body}>
              This page is only reachable after Paystack
              redirects you back from checkout, and no payment
              reference was found in the URL. If you followed a
              link here directly, go back to Adanse and start
              the purchase again from the Credits screen.
            </p>

            <div style={styles.actions}>
              <Link
                to="/"
                className="btn btn-primary"
              >
                Back to Adanse
              </Link>
            </div>
          </>
        )}

        {status === "verifying" && (
          <div style={styles.spinnerWrap}>
            <div
              className="upload-progress-spinner"
              aria-hidden="true"
            />

            <div className="upload-progress-text">
              Confirming your payment…
            </div>

            <div className="upload-progress-sub">
              This only takes a moment. Please don't close this
              tab.
            </div>
          </div>
        )}

        {status === "success" && (
          <>
            <h1 style={styles.title}>
              Payment confirmed.
            </h1>

            <div style={styles.alertSuccess}>
              {credits !== null
                ? `${credits.toLocaleString()} credits were added to your Adanse account.`
                : "Your credits are ready."}
            </div>

            <div style={styles.actions}>
              <Link
                to="/"
                className="btn btn-primary"
              >
                Continue to Adanse
              </Link>
            </div>
          </>
        )}

        {(status === "error" ||
          status === "network-error" ||
          status === "pending") && (
          <>
            <h1 style={styles.title}>
              {status === "pending"
                ? "Still confirming…"
                : "We couldn't confirm this payment."}
            </h1>

            <div style={styles.alertError}>
              {message}
            </div>

            {reference && (
              <p style={styles.referenceNote}>
                Reference: {reference}
              </p>
            )}

            <div style={styles.actions}>
              {isRetryable && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={runVerify}
                >
                  Try again
                </button>
              )}

              <Link
                to="/"
                className="btn btn-secondary"
              >
                Back to Adanse
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
  },

  card: {
    width: "100%",
    maxWidth: "480px",
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "20px",
    boxShadow: "var(--shadow)",
    padding: "40px 35px",
    textAlign: "center",
  },

  title: {
    font: "600 clamp(24px, 4vw, 30px) / 1.1 var(--display)",
    letterSpacing: "-0.03em",
    margin: "10px 0 16px",
  },

  body: {
    margin: "0 0 28px",
    color: "var(--muted)",
    fontSize: "15px",
    lineHeight: 1.6,
  },

  spinnerWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "14px",
    padding: "20px 0 8px",
  },

  actions: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
  },

  alertError: {
    marginBottom: "20px",
    padding: "14px 16px",
    borderRadius: "12px",
    background: "rgba(180, 55, 55, 0.08)",
    border: "1px solid rgba(180, 55, 55, 0.18)",
    color: "#a33",
    fontSize: "14px",
    lineHeight: 1.5,
    textAlign: "left",
  },

  alertSuccess: {
    marginBottom: "28px",
    padding: "14px 16px",
    borderRadius: "12px",
    background: "rgba(44, 126, 82, 0.08)",
    border: "1px solid rgba(44, 126, 82, 0.18)",
    color: "var(--green)",
    fontSize: "15px",
    lineHeight: 1.5,
  },

  referenceNote: {
    margin: "-8px 0 24px",
    color: "var(--muted)",
    fontSize: "12px",
    wordBreak: "break-all",
  },
};
