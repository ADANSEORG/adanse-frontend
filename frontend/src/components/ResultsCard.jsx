import { useEffect, useState } from "react";
import ResultsCard from "./ResultsCard.jsx";
import { addMessage, chat } from "../api.js";

export default function ThesisWorkspace({
  project,
  upload,
  plan,
  analysis,
  onBuildPlan,
  onRun,
  onContinueChapter4,
  loading,
  conversationId,
}) {
  const [selected, setSelected] =
    useState(0);

  const [question, setQuestion] =
    useState("");

  const [chatLoading, setChatLoading] =
    useState(false);

  const [chatItems, setChatItems] =
    useState([]);

  const planItems =
    plan?.items || [];

  const objectives =
    analysis?.results || [];

  useEffect(() => {
    setSelected(0);
  }, [analysis]);

  useEffect(() => {
    if (
      objectives.length > 0 &&
      selected >= objectives.length
    ) {
      setSelected(0);
    }
  }, [
    objectives.length,
    selected,
  ]);

  const selectedObjective =
    objectives[selected] || null;

  const selectedAnalyses =
    selectedObjective?.analyses || [];

  const ask = async (event) => {
    event.preventDefault();

    const value =
      question.trim();

    if (
      !value ||
      !conversationId ||
      chatLoading
    ) {
      return;
    }

    setChatLoading(true);

    try {
      const userMessage =
        await addMessage(
          conversationId,
          "user",
          value
        );

      setChatItems(
        (current) => [
          ...current,
          userMessage,
        ]
      );

      setQuestion("");

      const assistantMessage =
        await chat(
          conversationId,
          value
        );

      setChatItems(
        (current) => [
          ...current,
          assistantMessage,
        ]
      );
    } catch (error) {
      setChatItems(
        (current) => [
          ...current,
          {
            id:
              `error-${Date.now()}`,

            role:
              "assistant",

            content:
              error.message ||
              "I couldn't answer that right now.",
          },
        ]
      );
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="thesis-workspace">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="workspace-intro">

        <div>

          <div className="section-kicker">
            {project?.title}
          </div>

          <h1>
            {analysis
              ? "Your findings."
              : "Your analysis plan."}
          </h1>

          <p>
            {analysis
              ? "Adanse has analysed the variables relevant to each research objective."
              : "Review how Adanse plans to answer each of your research objectives before running the analysis."}
          </p>

        </div>

        {upload && (
          <div className="dataset-pill">

            <strong>
              {upload.dataset_filename ||
                upload.filename}
            </strong>

            <span>
              {(
                upload.dataset_rows ||
                upload.rows ||
                0
              ).toLocaleString()}{" "}
              observations ·{" "}
              {(
                upload.dataset_columns ||
                upload.columns ||
                []
              ).length}{" "}
              variables
            </span>

          </div>
        )}

      </div>


      {/* =====================================================
          PLAN
          ===================================================== */}

      {!analysis &&
        plan && (
          <div className="plan-list">

            {planItems.map(
              (item, index) => (
                <button
                  key={
                    item.id ||
                    index
                  }
                  className={`plan-item ${
                    selected === index
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setSelected(index)
                  }
                  type="button"
                >

                  <div className="plan-num">
                    {String(
                      index + 1
                    ).padStart(
                      2,
                      "0"
                    )}
                  </div>

                  <div className="plan-main">

                    <strong>
                      {item.objective}
                    </strong>

                    <span>
                      {item.analysis_count ||
                        0}{" "}
                      {(
                        item.analysis_count ||
                        0
                      ) === 1
                        ? "analysis"
                        : "analyses"}{" "}
                      planned
                    </span>

                    <small
                      className={
                        item.status ===
                        "ready"
                          ? ""
                          : "review-status"
                      }
                    >
                      {item.status ===
                      "ready"
                        ? "Ready to run"
                        : "Needs review"}
                    </small>

                  </div>

                  <div className="plan-arrow">
                    →
                  </div>

                </button>
              )
            )}

          </div>
        )}


      {/* =====================================================
          NO PLAN
          ===================================================== */}

      {!plan && (
        <div className="empty-panel">

          <h2>
            Build the analysis plan
          </h2>

          <p>
            Adanse will inspect your
            dataset and determine which
            variables and statistical
            methods are relevant to each
            research objective.
          </p>

          <button
            className="btn btn-primary"
            onClick={onBuildPlan}
            disabled={loading}
            type="button"
          >
            {loading
              ? "Building plan…"
              : "Build my analysis plan"}
          </button>

        </div>
      )}


      {/* =====================================================
          SELECTED PLAN OBJECTIVE
          ===================================================== */}

      {!analysis &&
        plan &&
        planItems[selected] && (
          <>
            <div className="plan-detail">

              <div className="detail-copy">

                <div className="detail-label">
                  OBJECTIVE
                </div>

                <h2>
                  {
                    planItems[
                      selected
                    ].objective
                  }
                </h2>

                <div
                  className="detail-label"
                  style={{
                    marginTop: 22,
                  }}
                >
                  WHAT WE'LL ANALYSE
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    flexWrap:
                      "wrap",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  {(
                    planItems[
                      selected
                    ].analyses || []
                  ).map(
                    (
                      item
                    ) => (
                      <span
                        key={
                          item.id
                        }
                        style={{
                          padding:
                            "7px 11px",
                          border:
                            "1px solid var(--color-line)",
                          borderRadius:
                            999,
                          fontSize:
                            13,
                        }}
                      >
                        {item.column_a}
                        {item.column_b
                          ? ` × ${item.column_b}`
                          : ""}
                      </span>
                    )
                  )}
                </div>

                {planItems[
                  selected
                ].error && (
                  <div className="warning-box">

                    <strong>
                      Needs review
                    </strong>

                    <p>
                      {
                        planItems[
                          selected
                        ].error
                      }
                    </p>

                  </div>
                )}

              </div>

            </div>

            <div className="run-panel">

              <div>

                <strong>
                  Ready to analyse your
                  thesis data?
                </strong>

                <p>
                  Adanse will run every
                  supported analysis shown
                  above and group the findings
                  under their corresponding
                  research objective.
                </p>

              </div>

              <button
                className="btn btn-primary"
                onClick={onRun}
                disabled={loading}
                type="button"
              >
                {loading
                  ? "Running analyses…"
                  : "Run full analysis →"}
              </button>

            </div>
          </>
        )}


      {/* =====================================================
          COMPLETED ANALYSIS
          ===================================================== */}

      {analysis && (
        <>

          {/* -------------------------------------------------
              OBJECTIVE TABS
              ------------------------------------------------- */}

          <div className="result-tabs">

            {objectives.map(
              (objective, index) => (
                <button
                  key={
                    objective.id ||
                    index
                  }
                  onClick={() =>
                    setSelected(index)
                  }
                  className={
                    index === selected
                      ? "active"
                      : ""
                  }
                  type="button"
                  title={
                    objective.objective
                  }
                >
                  {objective.objective ||
                    `Objective ${
                      index + 1
                    }`}
                </button>
              )
            )}

          </div>


          {/* -------------------------------------------------
              OBJECTIVE HEADER
              ------------------------------------------------- */}

          {selectedObjective && (
            <div
              style={{
                marginTop: 28,
                marginBottom: 24,
              }}
            >

              <div className="section-kicker">
                OBJECTIVE{" "}
                {selected + 1}
              </div>

              <h2
                style={{
                  margin:
                    "6px 0 8px",
                  fontSize: 26,
                  letterSpacing:
                    "-0.03em",
                }}
              >
                {
                  selectedObjective.objective
                }
              </h2>

              <p
                style={{
                  margin: 0,
                  color:
                    "var(--color-ink-soft)",
                  lineHeight: 1.6,
                }}
              >
                {selectedObjective.completed_count ||
                  0}{" "}
                of{" "}
                {selectedObjective.analysis_count ||
                  0}{" "}
                planned analyses completed.
              </p>

            </div>
          )}


          {/* -------------------------------------------------
              ANALYSES UNDER OBJECTIVE
              ------------------------------------------------- */}

          {selectedObjective &&
            selectedAnalyses.length >
              0 && (
              <div>

                {selectedAnalyses.map(
                  (
                    item,
                    index
                  ) => {

                    if (
                      item.status !==
                        "complete" ||
                      !item.result
                    ) {
                      return (
                        <div
                          key={
                            item.id ||
                            index
                          }
                          className="empty-panel"
                          style={{
                            marginBottom:
                              18,
                          }}
                        >

                          <div className="section-kicker">
                            ANALYSIS{" "}
                            {index +
                              1}
                          </div>

                          <h3>
                            {item.column_a ||
                              "Analysis"}
                          </h3>

                          <p>
                            {item.error ||
                              "This analysis needs review."}
                          </p>

                        </div>
                      );
                    }

                    return (
                      <div
                        key={
                          item.id ||
                          index
                        }
                        style={{
                          marginBottom:
                            28,
                        }}
                      >

                        <div
                          style={{
                            marginBottom:
                              10,
                          }}
                        >

                          <div className="section-kicker">
                            ANALYSIS{" "}
                            {index +
                              1}
                          </div>

                          <h3
                            style={{
                              margin:
                                "5px 0 4px",
                              fontSize:
                                20,
                              letterSpacing:
                                "-0.02em",
                            }}
                          >
                            {item.column_a ||
                              item.result
                                ?.columns?.[
                                0
                              ] ||
                              "Variable"}
                            {item.column_b
                              ? ` × ${item.column_b}`
                              : ""}
                          </h3>

                          <p
                            style={{
                              margin: 0,
                              fontSize:
                                13,
                              color:
                                "var(--color-ink-soft)",
                            }}
                          >
                            {
                              item.test_name
                            }
                          </p>

                        </div>

                        <ResultsCard
                          result={
                            item.result
                          }
                          objective={
                            selectedObjective
                          }
                        />

                      </div>
                    );
                  }
                )}

              </div>
            )}


          {/* -------------------------------------------------
              OBJECTIVE WITH NO RESULTS
              ------------------------------------------------- */}

          {selectedObjective &&
            selectedAnalyses.length ===
              0 && (
              <div className="empty-panel">

                <h2>
                  No supported analysis
                  was completed.
                </h2>

                <p>
                  {selectedObjective.error ||
                    "Adanse could not find a supported method for this objective."}
                </p>

              </div>
            )}


          {/* =================================================
              CHAPTER 4
              ================================================= */}

          <div className="continue-chapter-card">

            <div className="continue-chapter-copy">

              <div className="section-kicker">
                NEXT · CHAPTER 4
              </div>

              <h2>
                Turn these findings into
                Chapter 4.
              </h2>

              <p>
                Your completed analyses
                will be organized by
                research objective in the
                generated Results chapter.
              </p>

            </div>

            <button
              className="btn btn-primary btn-large"
              onClick={
                onContinueChapter4
              }
              disabled={
                !onContinueChapter4
              }
              type="button"
            >
              Continue to Chapter 4 →
            </button>

          </div>


          {/* =================================================
              FOLLOW-UP CHAT
              ================================================= */}

          <section className="followup-card">

            <div className="section-kicker">
              CONTINUE YOUR RESEARCH
            </div>

            <h2>
              Ask about your findings.
            </h2>

            <p>
              Ask Adanse to explain a
              result, clarify a statistical
              decision, or help you
              understand what belongs in
              your thesis.
            </p>

            {chatItems.length >
              0 && (
              <div className="followup-history">

                {chatItems.map(
                  (message) => (
                    <div
                      key={
                        message.id
                      }
                      className={`followup-message ${message.role}`}
                    >

                      <strong>
                        {message.role ===
                        "user"
                          ? "You"
                          : "Adanse"}
                      </strong>

                      <p>
                        {
                          message.content
                        }
                      </p>

                    </div>
                  )
                )}

              </div>
            )}

            <form
              onSubmit={ask}
              className="followup-form"
            >

              <input
                className="text-input"
                value={question}
                onChange={(
                  event
                ) =>
                  setQuestion(
                    event.target
                      .value
                  )
                }
                placeholder="e.g. What does this result mean for my hypothesis?"
                maxLength={4000}
                disabled={
                  chatLoading
                }
              />

              <button
                className="btn btn-primary"
                disabled={
                  !question.trim() ||
                  chatLoading
                }
                type="submit"
              >
                {chatLoading
                  ? "Thinking…"
                  : "Ask"}
              </button>

            </form>

          </section>

        </>
      )}

    </div>
  );
}