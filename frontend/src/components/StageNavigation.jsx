const STAGES = [
  {
    id: "upload",
    label: "DATASET",
  },
  {
    id: "question",
    label: "RESEARCH",
  },
  {
    id: "confirm",
    label: "ANALYSIS",
  },
  {
    id: "results",
    label: "CHAPTER 4",
  },
];

export default function StageNavigation({
  currentStep,
  onStepChange,
  canContinue = true,
}) {
  const currentIndex = STAGES.findIndex(
    (stage) => stage.id === currentStep
  );

  const safeIndex =
    currentIndex === -1 ? 0 : currentIndex;

  const previousStage =
    STAGES[safeIndex - 1];

  const nextStage =
    STAGES[safeIndex + 1];

  function goBack() {
    if (!previousStage) return;

    onStepChange(previousStage.id);
  }

  function goForward() {
    if (!nextStage || !canContinue) return;

    onStepChange(nextStage.id);
  }

  function handleStageClick(stage, index) {
    if (
      index > safeIndex &&
      !canContinue
    ) {
      return;
    }

    onStepChange(stage.id);
  }

  return (
    <div className="stage-navigation">

      <div className="stage-navigation-actions">

        <button
          type="button"
          className={`stage-nav-button ${
            !previousStage
              ? "disabled"
              : ""
          }`}
          onClick={goBack}
          disabled={!previousStage}
        >
          <span className="stage-nav-arrow">
            ←
          </span>

          <span>
            {previousStage
              ? `Back to ${previousStage.label.toLowerCase()}`
              : "Back"}
          </span>
        </button>

        <button
          type="button"
          className={`stage-nav-button ${
            !nextStage || !canContinue
              ? "disabled"
              : ""
          }`}
          onClick={goForward}
          disabled={
            !nextStage ||
            !canContinue
          }
        >
          <span>
            {nextStage
              ? `Continue to ${nextStage.label.toLowerCase()}`
              : "Complete"}
          </span>

          {nextStage && (
            <span className="stage-nav-arrow">
              →
            </span>
          )}
        </button>

      </div>

      <div className="stage-progress">

        {STAGES.map(
          (stage, index) => {

            const isActive =
              index === safeIndex;

            const isComplete =
              index < safeIndex;

            const isFuture =
              index > safeIndex;

            return (
              <button
                key={stage.id}
                type="button"
                className={[
                  "stage-progress-item",
                  isActive
                    ? "active"
                    : "",
                  isComplete
                    ? "complete"
                    : "",
                  isFuture
                    ? "future"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  handleStageClick(
                    stage,
                    index
                  )
                }
                disabled={
                  isFuture &&
                  !canContinue
                }
              >

                <span className="stage-progress-line" />

                <span className="stage-progress-label">
                  {stage.label}
                </span>

              </button>
            );
          }
        )}

      </div>

    </div>
  );
}