import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "./AuthContext.jsx";

import AuthScreen from "./components/AuthScreen.jsx";
import ConversationSidebar from "./components/ConversationSidebar.jsx";
import ThesisSetup from "./components/ThesisSetup.jsx";
import ThesisWorkspace from "./components/ThesisWorkspace.jsx";
import Chapter4 from "./components/Chapter4.jsx";
import UploadZone from "./components/UploadZone.jsx";
import ColumnPreview from "./components/ColumnPreview.jsx";
import Account from "./components/Account.jsx";
import Credits from "./components/Credits.jsx";

import {
  listConversations,
  createConversation,
  deleteConversation,
  getConversation,
  listMessages,
  addMessage,
  updateConversation,
  createThesisProject,
  getThesisProject,
  updateThesisProject,
  uploadThesisDataset,
  buildAnalysisPlan,
  runThesisAnalysis,
  downloadChapter4,
  getCredits,
} from "./api.js";

const friendly = (e) => {
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
    "We couldn't complete that step. Please try again."
  );
};

export default function App() {
  const {
    user,
    loading: authLoading,
    signOut,
  } = useAuth();

  const [
    conversations,
    setConversations,
  ] = useState([]);

  const [
    active,
    setActive,
  ] = useState(null);

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    project,
    setProject,
  ] = useState(null);

  const [
    upload,
    setUpload,
  ] = useState(null);

  const [
    plan,
    setPlan,
  ] = useState(null);

  const [
    analysis,
    setAnalysis,
  ] = useState(null);

  /*
   * Current credit balance.
   *
   * PostgreSQL/backend remains the source
   * of truth. This state is only the UI copy
   * of the current balance.
   */
  const [
    credits,
    setCredits,
  ] = useState(0);

  /*
   * IMPORTANT:
   *
   * setup     = Research
   * upload    = Dataset
   * workspace = Analysis
   * chapter4  = Chapter 4
   * account   = Account
   * credits   = Credits
   */
  const [
    step,
    setStep,
  ] = useState("setup");

  /*
   * Used by Account and Credits so the Back button
   * returns to whatever screen the user was on before
   * opening the settings menu.
   */
  const [
    returnStep,
    setReturnStep,
  ] = useState("setup");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const replaceInputRef =
    useRef(null);

  /*
   * ---------------------------------------------------------
   * LOAD CONVERSATIONS + CREDITS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setConversations([]);
      setActive(null);
      setCredits(0);
      return;
    }

    Promise.all([
      listConversations(),
      getCredits(),
    ])
      .then(
        ([
          conversationData,
          creditData,
        ]) => {
          setConversations(
            conversationData.conversations ||
              []
          );

          setCredits(
            Number(
              creditData?.balance || 0
            )
          );
        }
      )
      .catch((e) => {
        setError(
          friendly(e)
        );
      });
  }, [
    user?.id,
    authLoading,
  ]);

  /*
   * ---------------------------------------------------------
   * NEW CHAT
   * ---------------------------------------------------------
   */

  const newChat = async () => {
    if (creating) return;

    setCreating(true);
    setError("");

    try {
      const c =
        await createConversation();

      await createThesisProject({
        conversation_id: c.id,
        title: "Untitled research",
        objectives: [],
        research_questions: [],
        hypotheses: [],
        methodology: "",
      });

      setConversations((x) => [
        c,
        ...x,
      ]);

      setActive(c);

      setProject(
        await getThesisProject(
          c.id
        )
      );

      setMessages([]);
      setUpload(null);
      setPlan(null);
      setAnalysis(null);

      setStep("setup");
      setSidebarOpen(false);
    } catch (e) {
      setError(
        friendly(e)
      );
    } finally {
      setCreating(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * SELECT CONVERSATION
   * ---------------------------------------------------------
   */

  const select = async (c) => {
    setLoading(true);
    setError("");

    try {
      const [
        fresh,
        msg,
      ] = await Promise.all([
        getConversation(c.id),
        listMessages(c.id),
      ]);

      let p;

      try {
        p =
          await getThesisProject(
            c.id
          );
      } catch (e) {
        if (e?.status !== 404) {
          throw e;
        }

        p =
          await createThesisProject({
            conversation_id: c.id,
            title:
              fresh.title ||
              "Untitled research",
            objectives: [],
            research_questions: [],
            hypotheses: [],
            methodology: "",
          });
      }

      setActive(fresh);

      setMessages(
        msg.messages || []
      );

      setProject(p);

      setPlan(
        p.analysis_plan || null
      );

      setAnalysis(
        p.analysis_results || null
      );

      setUpload(
        p.dataset_path
          ? {
              dataset_filename:
                p.dataset_filename,
              dataset_rows:
                p.dataset_rows,
              dataset_columns:
                p.dataset_columns,
            }
          : null
      );

      /*
       * Decide where the user should return.
       *
       * Analysis results exist:
       *     Analysis screen.
       *
       * Analysis plan exists:
       *     Analysis screen.
       *
       * Dataset exists:
       *     Dataset screen.
       *
       * Otherwise:
       *     Research screen.
       */

      if (p.analysis_results) {
        setStep("workspace");
      } else if (
        p.analysis_plan
      ) {
        setStep("workspace");
      } else if (
        p.dataset_path
      ) {
        setStep("upload");
      } else {
        setStep("setup");
      }

      setSidebarOpen(false);
    } catch (e) {
      setError(
        friendly(e)
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * SAVE RESEARCH CONTEXT
   * ---------------------------------------------------------
   */

  const saveSetup = async (
    data
  ) => {
    setLoading(true);
    setError("");

    try {
      let c = active;

      if (!c) {
        c =
          await createConversation(
            data.title.slice(
              0,
              80
            )
          );

        setActive(c);

        setConversations((x) => [
          c,
          ...x,
        ]);

        await createThesisProject({
          conversation_id: c.id,
          ...data,
        });
      } else {
        await updateThesisProject(
          c.id,
          data
        );

        if (
          c.title ===
            "New Analysis" ||
          c.title ===
            "Untitled research"
        ) {
          const updated =
            await updateConversation(
              c.id,
              data.title.slice(
                0,
                80
              )
            );

          setActive(updated);

          setConversations(
            (x) =>
              x.map((v) =>
                v.id ===
                updated.id
                  ? updated
                  : v
              )
          );
        }
      }

      const p =
        await getThesisProject(
          c.id
        );

      setProject(p);
      setStep("upload");
    } catch (e) {
      setError(
        friendly(e)
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * UPLOAD DATASET
   * ---------------------------------------------------------
   */

  const file = async (f) => {
    setLoading(true);
    setError("");

    try {
      let conversation =
        active;

      if (!conversation) {
        conversation =
          await createConversation(
            project?.title ||
              "Untitled research"
          );

        await createThesisProject({
          conversation_id:
            conversation.id,
          ...(project || {
            title:
              "Untitled research",
            objectives: [],
            research_questions:
              [],
            hypotheses: [],
            methodology: "",
          }),
        });

        setActive(
          conversation
        );

        setConversations(
          (x) => [
            conversation,
            ...x,
          ]
        );
      }

      const id =
        conversation.id;

      const d =
        await uploadThesisDataset(
          id,
          f
        );

      setUpload(d);

      setProject(
        await getThesisProject(
          id
        )
      );

      /*
       * Upload complete.
       * Move directly to Analysis.
       */
      setStep("workspace");
    } catch (e) {
      setError(
        friendly(e)
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * BUILD ANALYSIS PLAN
   * ---------------------------------------------------------
   */

  const build = async () => {
    if (!active) return;

    setLoading(true);
    setError("");

    try {
      const p =
        await buildAnalysisPlan(
          active.id
        );

      setPlan(p);

      setProject(
        await getThesisProject(
          active.id
        )
      );

      setStep("workspace");
    } catch (e) {
      setError(
        friendly(e)
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * RUN ANALYSIS
   * ---------------------------------------------------------
   */

  const run = async () => {
    if (!active) return;

    setLoading(true);
    setError("");

    try {
      const a =
        await runThesisAnalysis(
          active.id
        );

      setAnalysis(a);

      /*
       * Backend returns the new balance
       * after a successful analysis.
       */
      if (
        a?.credits_remaining !==
        undefined
      ) {
        setCredits(
          Number(
            a.credits_remaining
          )
        );
      }

      setProject(
        await getThesisProject(
          active.id
        )
      );

      /*
       * STAY ON ANALYSIS.
       *
       * Do NOT jump to Chapter 4 automatically.
       *
       * The user needs to review the findings first.
       */
      setStep("workspace");

      const completed =
        Array.isArray(a?.objective_results)
          ? a.objective_results.reduce(
              (total, group) =>
                total +
                (group.analyses || []).filter(
                  (x) => x.status === "complete"
                ).length,
              0
            )
          : Array.isArray(a?.results)
            ? a.results.filter((x) => x.status === "complete").length
            : 0;

      await addMessage(
        active.id,
        "assistant",
        `Analysis completed for ${completed} research objective(s).`
      );
    } catch (e) {
      setError(
        friendly(e)
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * CHAPTER 4
   * ---------------------------------------------------------
   */

  const goToChapter4 =
    () => {
      if (!analysis) return;

      setError("");
      setStep("chapter4");
    };

  /*
   * ---------------------------------------------------------
   * BACK TO ANALYSIS
   * ---------------------------------------------------------
   */

  const backToAnalysis =
    () => {
      setError("");
      setStep("workspace");
    };

  /*
   * ---------------------------------------------------------
   * ACCOUNT / CREDITS
   * ---------------------------------------------------------
   */

  const openAccount =
    () => {
      /*
       * Remember exactly where
       * the user was.
       */
      setReturnStep(step);

      /*
       * Open Account without
       * changing the active
       * research project.
       */
      setStep("account");
      setSidebarOpen(false);
      setError("");
    };

  const backFromAccount =
    () => {
      setError("");
      setStep(
        returnStep || "setup"
      );
    };

  const openCredits =
    async () => {
      /*
       * Remember exactly where
       * the user was.
       */
      setReturnStep(step);

      /*
       * Refresh the balance before
       * opening Credits so the page
       * is never unnecessarily stale.
       */
      try {
        const data =
          await getCredits();

        setCredits(
          Number(
            data?.balance || 0
          )
        );
      } catch (e) {
        /*
         * Do not block opening the
         * Credits page if refresh
         * fails. Credits.jsx will
         * try again itself.
         */
        console.error(
          "Could not refresh credits:",
          e
        );
      }

      /*
       * Open Credits without
       * changing the active
       * research project.
       */
      setStep("credits");
      setSidebarOpen(false);
      setError("");
    };

  const backFromCredits =
    () => {
      setError("");
      setStep(
        returnStep || "setup"
      );
    };

  /*
   * ---------------------------------------------------------
   * DOWNLOAD CHAPTER 4
   * ---------------------------------------------------------
   */

  const download =
    async () => {
      if (!active) return;

      setLoading(true);
      setError("");

      try {
        /*
         * api.js returns both the
         * DOCX blob and the credit
         * headers from the backend.
         */
        const result =
          await downloadChapter4(
            active.id
          );

        const url =
          URL.createObjectURL(
            result.blob
          );

        const a =
          document.createElement(
            "a"
          );

        a.href = url;

        a.download =
          "adanse-chapter-4.docx";

        document.body.appendChild(
          a
        );

        a.click();

        a.remove();

        URL.revokeObjectURL(
          url
        );

        /*
         * Backend returns the
         * remaining balance through
         * X-Credits-Remaining.
         */
        if (
          result.creditsRemaining !==
          undefined
        ) {
          setCredits(
            Number(
              result.creditsRemaining
            )
          );
        }
      } catch (e) {
        setError(
          friendly(e)
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * ---------------------------------------------------------
   * AUTH LOADING
   * ---------------------------------------------------------
   */

  if (authLoading) {
    return (
      <div className="loading-screen">
        Checking your session…
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  /*
   * ---------------------------------------------------------
   * CURRENT STAGE
   * ---------------------------------------------------------
   */

  const isResearch =
    step === "setup";

  const isDataset =
    step === "upload";

  const isAnalysis =
    step === "workspace";

  const isChapter4 =
    step === "chapter4";

  const isAccount =
    step === "account";

  const isCredits =
    step === "credits";

  const isSettingsPage =
    isAccount || isCredits;

  return (
    <div className="app-layout">
      <ConversationSidebar
        conversations={
          conversations
        }
        activeId={
          active?.id
        }
        loading={false}
        error={null}
        creating={creating}
        onNewChat={newChat}
        onSelect={select}
        onDelete={async (c) => {
          try {
            await deleteConversation(
              c.id
            );

            setConversations(
              (x) =>
                x.filter(
                  (v) =>
                    v.id !==
                    c.id
                )
            );

            if (
              active?.id ===
              c.id
            ) {
              setActive(null);
              setProject(null);
              setUpload(null);
              setPlan(null);
              setAnalysis(null);
              setMessages([]);
              setStep("setup");
            }
          } catch (e) {
            setError(
              friendly(e)
            );
          }
        }}
        user={user}
        onAccount={
          openAccount
        }
        onCredits={
          openCredits
        }
        credits={credits}
        onSignOut={
          signOut
        }
        open={
          sidebarOpen
        }
        onClose={() =>
          setSidebarOpen(
            false
          )
        }
      />

      <main className="app-main">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="header">
          <div>
            <button
              className="sidebar-toggle"
              onClick={() =>
                setSidebarOpen(
                  true
                )
              }
              type="button"
            >
              Chats
            </button>

            <div className="logo">
              Adanse
            </div>

            <div className="tagline">
              {project?.title ||
                (isAccount
                  ? "account"
                  : isCredits
                  ? "credits"
                  : "thesis data analysis")}
            </div>
          </div>
        </header>

        {/* =====================================================
            TOP NAVIGATION
            Hidden on Account / Credits.
        ===================================================== */}

        {active &&
          !isSettingsPage && (
            <div className="flow-navigation">
              <button
                type="button"
                className="flow-back"
                onClick={() => {
                  if (
                    isChapter4
                  ) {
                    backToAnalysis();
                  } else if (
                    isAnalysis
                  ) {
                    setStep(
                      "upload"
                    );
                  } else if (
                    isDataset
                  ) {
                    setStep(
                      "setup"
                    );
                  }
                }}
                disabled={
                  isResearch
                }
              >
                <span>←</span>
                <span>Back</span>
              </button>

              {isAnalysis &&
              analysis ? (
                <button
                  type="button"
                  className="flow-continue"
                  onClick={
                    goToChapter4
                  }
                >
                  <span>
                    Continue to
                  </span>

                  <span>
                    Chapter 4 →
                  </span>
                </button>
              ) : isChapter4 ? (
                <div className="flow-current">
                  Chapter 4
                </div>
              ) : null}
            </div>
          )}

        {/* =====================================================
            PROGRESS
            Hidden on Account / Credits.
        ===================================================== */}

        {!isSettingsPage && (
          <div className="progress-steps">
            <span
              className={
                isResearch
                  ? "active"
                  : "done"
              }
            >
              Research
            </span>

            <span
              className={
                isDataset
                  ? "active"
                  : !isResearch
                  ? "done"
                  : ""
              }
            >
              Dataset
            </span>

            <span
              className={
                isAnalysis
                  ? "active"
                  : isChapter4
                  ? "done"
                  : ""
              }
            >
              Analysis
            </span>

            <span
              className={
                isChapter4
                  ? "active"
                  : ""
              }
            >
              Chapter 4
            </span>
          </div>
        )}

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <div className="content-shell">
          {/* =================================================
              ACCOUNT
          ================================================= */}

          {isAccount && (
            <Account
              user={user}
              onBack={
                backFromAccount
              }
              onSignOut={
                signOut
              }
            />
          )}

          {/* =================================================
              CREDITS
          ================================================= */}

          {isCredits && (
            <Credits
              onBack={
                backFromCredits
              }
              balance={credits}
              onBalanceChange={
                setCredits
              }
            />
          )}

          {/* =================================================
              RESEARCH
          ================================================= */}

          {!isSettingsPage &&
            !active && (
              <ThesisSetup
                initial={project}
                onSave={
                  saveSetup
                }
                loading={
                  loading
                }
              />
            )}

          {!isSettingsPage &&
            active &&
            isResearch && (
              <ThesisSetup
                initial={project}
                onSave={
                  saveSetup
                }
                loading={
                  loading
                }
              />
            )}

          {/* =================================================
              DATASET
          ================================================= */}

          {!isSettingsPage &&
            active &&
            isDataset && (
              <section>
                <div className="workspace-intro">
                  <div>
                    <div className="section-kicker">
                      02 · DATASET
                    </div>

                    <h1>
                      Bring your research data.
                    </h1>

                    <p>
                      Upload the CSV or Excel file
                      behind your thesis. Adanse will
                      profile it before choosing any
                      analysis.
                    </p>
                  </div>
                </div>

                {!upload ? (
                  <UploadZone
                    onFileSelected={
                      file
                    }
                    disabled={
                      loading
                    }
                  />
                ) : (
                  <>
                    <input
                      ref={
                        replaceInputRef
                      }
                      className="current-dataset-file-input"
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      onChange={async (
                        event
                      ) => {
                        const selectedFile =
                          event.target
                            .files?.[0];

                        if (
                          selectedFile
                        ) {
                          await file(
                            selectedFile
                          );
                        }

                        event.target.value =
                          "";
                      }}
                      disabled={
                        loading
                      }
                    />

                    <div className="current-dataset-card">
                      <div className="current-dataset-copy">
                        <div className="current-dataset-label">
                          CURRENT DATASET
                        </div>

                        <div className="current-dataset-name">
                          {upload.filename ||
                            upload.dataset_filename ||
                            "Your dataset"}
                        </div>

                        <div className="current-dataset-meta">
                          {(
                            upload.rows ||
                            upload.dataset_rows ||
                            0
                          ).toLocaleString()}{" "}
                          observations ·{" "}
                          {(
                            upload.columns ||
                            upload.dataset_columns ||
                            []
                          ).length}{" "}
                          variables
                        </div>
                      </div>

                      <div className="current-dataset-actions">
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() =>
                            replaceInputRef.current?.click()
                          }
                          disabled={
                            loading
                          }
                        >
                          Replace dataset
                        </button>

                        <button
                          className="btn btn-primary"
                          type="button"
                          onClick={() => {
                            setError(
                              ""
                            );

                            setStep(
                              "workspace"
                            );
                          }}
                          disabled={
                            loading
                          }
                        >
                          Continue →
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {upload && (
                  <ColumnPreview
                    filename={
                      upload.filename ||
                      upload.dataset_filename
                    }
                    rows={
                      upload.rows ||
                      upload.dataset_rows
                    }
                    columns={
                      upload.columns ||
                      upload.dataset_columns
                    }
                  />
                )}
              </section>
            )}

          {/* =================================================
              ANALYSIS
          ================================================= */}

          {!isSettingsPage &&
            active &&
            isAnalysis && (
              <ThesisWorkspace
                project={project}
                upload={upload}
                plan={plan}
                analysis={analysis}
                onBuildPlan={
                  build
                }
                onRun={run}
                onContinueChapter4={
                  goToChapter4
                }
                loading={
                  loading
                }
                conversationId={
                  active.id
                }
              />
            )}

          {/* =================================================
              CHAPTER 4
          ================================================= */}

          {!isSettingsPage &&
            active &&
            isChapter4 &&
            analysis && (
              <Chapter4
                project={project}
                upload={upload}
                plan={plan}
                analysis={analysis}
                onBack={
                  backToAnalysis
                }
                onDownload={
                  download
                }
                loading={
                  loading
                }
              />
            )}

          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}