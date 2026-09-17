import { useState } from "react";

/*
 * Wraps a credit-charging action (Run Analysis, Export Chapter 4) with:
 *
 * - an inline "Uses N credits" notice, sourced from the same live cost
 *   the backend charges with (GET /api/v1/credits' costs field) -- never
 *   a hardcoded number here.
 * - a one-click confirmation step when the balance is exactly enough to
 *   cover the cost (this run/export will zero it out), so that's known
 *   before clicking rather than discovered after.
 * - a blocked, explained state when the balance can't cover the cost at
 *   all, instead of letting the click reach the backend's generic 402.
 */
export default function CreditActionButton({
  label,
  confirmLabel,
  loadingLabel,
  cost,
  balance,
  loading,
  disabled,
  onConfirm,
  onBuyCredits,
  className = "btn btn-primary",
}) {
  const [confirming, setConfirming] = useState(false);

  const hasCost = Number.isFinite(cost);
  const hasBalance = Number.isFinite(balance);

  const insufficient =
    hasCost && hasBalance && balance < cost;

  const usesLastCredits =
    hasCost && hasBalance && !insufficient && balance <= cost;

  function handleClick() {
    if (insufficient) return;

    if (usesLastCredits && !confirming) {
      setConfirming(true);
      return;
    }

    setConfirming(false);
    onConfirm();
  }

  return (
    <div className="credit-action">
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={Boolean(disabled) || loading || insufficient}
      >
        {loading
          ? loadingLabel
          : confirming
            ? confirmLabel
            : label}
      </button>

      {hasCost && (
        <div className="credit-action-notice">
          {insufficient ? (
            <span className="credit-action-insufficient">
              You don't have enough credits for this
              — it uses {cost} credits and you have{" "}
              {balance}.
              {onBuyCredits && (
                <button
                  type="button"
                  className="credit-action-buy-link"
                  onClick={onBuyCredits}
                >
                  Buy credits
                </button>
              )}
            </span>
          ) : usesLastCredits ? (
            <span className="credit-action-warning">
              {confirming
                ? `This will use your last ${cost} credits. Click again to confirm.`
                : `Uses ${cost} credits — this will take your balance to 0.`}
            </span>
          ) : (
            <span className="credit-action-cost">
              Uses {cost} credits
            </span>
          )}
        </div>
      )}
    </div>
  );
}
