import { useEffect, useState } from "react";
import { getCredits } from "../api.js";

/*
 * Shown once, right after signup (see needs_welcome in AuthContext.jsx).
 * The credit balance is always fetched live from GET /api/v1/credits --
 * never hardcoded -- and the copy degrades to generic wording rather than
 * showing a broken/zero number if that fetch fails. Failure here must
 * never block the modal or signup itself.
 */
export default function WelcomeModal({ onDismiss }) {
  const [balance, setBalance] = useState(null);
  const [balanceFailed, setBalanceFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCredits()
      .then((data) => {
        if (cancelled) return;

        const value = Number(data?.balance);

        if (Number.isFinite(value)) {
          setBalance(value);
        } else {
          setBalanceFailed(true);
        }
      })
      .catch((error) => {
        console.error(
          "Could not load starting credit balance for the welcome modal:",
          error
        );

        if (!cancelled) {
          setBalanceFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="welcome-modal-backdrop">
      <div
        className="welcome-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
      >
        <div className="welcome-modal-coin" aria-hidden="true">
          <div className="welcome-modal-coin-inner" />
        </div>

        <h2
          id="welcome-modal-title"
          className="welcome-modal-title"
        >
          Welcome to Adanse!
        </h2>

        <p className="welcome-modal-body">
          {balance !== null ? (
            <>
              Your account is ready with{" "}
              <strong>
                {balance.toLocaleString()} credits
              </strong>{" "}
              to get started.
            </>
          ) : balanceFailed ? (
            <>
              Your account is ready, and comes with a
              starting credit balance to get you going.
            </>
          ) : (
            <>Your account is ready.</>
          )}
        </p>

        <p className="welcome-modal-body welcome-modal-explainer">
          Credits are used when Adanse runs your analysis
          and generates your results — you can use them
          across as many projects as you like until they
          run out.
        </p>

        <button
          type="button"
          className="btn btn-primary btn-large welcome-modal-cta"
          onClick={onDismiss}
        >
          Start your first project →
        </button>
      </div>
    </div>
  );
}
