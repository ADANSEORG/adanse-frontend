import { Check } from "lucide-react";

/*
 * Horizontal Research -> Dataset -> Analysis -> Chapter 4 stepper.
 * Completed steps are clickable when the workflow has a handler for them.
 * Upcoming steps stay disabled and explain what is needed in their tooltip.
 */
export default function Stepper({ steps, current, onNavigate }) {
  const safeCurrent = Math.max(
    0,
    Math.min(current, steps.length - 1)
  );

  const currentLabel = steps[safeCurrent]?.label || "";

  return (
    <nav
      className="stepper"
      aria-label="Analysis steps"
    >
      <span className="stepper-compact">
        Step {safeCurrent + 1} of {steps.length}: {currentLabel}
      </span>

      <ol className="stepper-list">
        {steps.map((step, index) => {
          const state =
            index < safeCurrent
              ? "done"
              : index === safeCurrent
              ? "current"
              : "upcoming";

          const canNavigate =
            state === "done" &&
            Boolean(step.available);

          return (
            <li
              key={step.key}
              className={`stepper-step ${state}`}
            >
              <button
                type="button"
                className="stepper-button"
                aria-current={
                  state === "current"
                    ? "step"
                    : undefined
                }
                disabled={state === "upcoming" || !canNavigate}
                title={
                  state === "upcoming"
                    ? step.lockedReason ||
                      "Complete the previous steps to unlock this step."
                    : canNavigate
                    ? `Go to ${step.label}`
                    : undefined
                }
                onClick={
                  canNavigate
                    ? () => onNavigate(step.key)
                    : undefined
                }
              >
                <span
                  className="stepper-number"
                  aria-hidden="true"
                >
                  {state === "done" ? (
                    <Check size={13} strokeWidth={2.4} />
                  ) : (
                    index + 1
                  )}
                </span>

                <span className="stepper-label">
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
