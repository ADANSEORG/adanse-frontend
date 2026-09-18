import { useRef, useState } from "react";

import { useAuth } from "./AuthContext.jsx";
import { useThesisWorkflow } from "./hooks/useThesisWorkflow.js";

import AuthScreen from "./components/AuthScreen.jsx";
import WelcomeModal from "./components/WelcomeModal.jsx";
import ConversationSidebar from "./components/ConversationSidebar.jsx";
import ThesisSetup from "./components/ThesisSetup.jsx";
import ThesisWorkspace from "./components/ThesisWorkspace.jsx";
import Chapter4 from "./components/Chapter4.jsx";
import UploadZone from "./components/UploadZone.jsx";
import ColumnPreview from "./components/ColumnPreview.jsx";
import DatasetReview from "./components/DatasetReview.jsx";
import Account from "./components/Account.jsx";
import Credits from "./components/Credits.jsx";

export default function App() {
  const {
    user,
    loading: authLoading,
    markWelcomeSeen,
    signOut,
  } = useAuth();

  // needs_welcome is stamped on the account only at signup (see
  // AuthContext.jsx's signUp()), so it's naturally absent/false for every
  // user who existed before this feature shipped -- they never see this.
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const showWelcome =
    Boolean(user?.user_metadata?.needs_welcome) &&
    !welcomeDismissed;

  async function dismissWelcome() {
    // Hide immediately -- this must never leave the user stuck behind the
    // modal if the metadata write below is slow or fails.
    setWelcomeDismissed(true);

    try {
      await markWelcomeSeen();
    } catch (error) {
      console.error(
        "Could not persist welcome-modal dismissal:",
        error
      );
      // Worst case: needs_welcome stays true server-side and the modal
      // shows once more on a later login. Acceptable degrade -- better
      // than blocking the user right now.
    }
  }

  const {
    conversations,
    active,
    project,
    upload,
    plan,
    analysis,
    datasetVersion,
    credits,
    setCredits,
    costs,
    step,
    setStep,
    loading,
    error,
    setError,
    sidebarOpen,
    setSidebarOpen,
    creating,

    newChat,
    select,
    deleteChat,
    saveSetup,
    file,
    validateDataset,
    applyGroupings,
    activateDataset,
    build,
    run,
    onQualitativeFinalized,
    goToChapter4,
    backToAnalysis,
    openAccount,
    backFromAccount,
    openCredits,
    backFromCredits,
    download,
  } = useThesisWorkflow({ user, authLoading });

  const replaceInputRef =
    useRef(null);

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

  const isReview =
    step === "review";

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
      {showWelcome && (
        <WelcomeModal onDismiss={dismissWelcome} />
      )}

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
        onDelete={deleteChat}
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
                      datasetVersion
                        ? "review"
                        : "upload"
                    );
                  } else if (
                    isReview
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
                isDataset || isReview
                  ? "active"
                  : isAnalysis || isChapter4
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
          {active && (
            <input
              ref={replaceInputRef}
              className="current-dataset-file-input"
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={async (event) => {
                const selectedFile =
                  event.target.files?.[0];

                if (selectedFile) {
                  await file(selectedFile);
                }

                event.target.value = "";
              }}
              disabled={loading}
            />
          )}

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
                key="new"
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
                key={active.id}
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

                {loading ? (
                  /*
                   * Covers both the first upload and a "Replace
                   * dataset" re-upload. Shown for the whole
                   * upload -> profile -> version-fetch sequence
                   * (loading only clears once every step,
                   * including the step change, has already
                   * happened -- see file() in
                   * useThesisWorkflow.js), so the user never sees
                   * a flash of the just-uploaded dataset card
                   * moments before the screen jumps to Dataset
                   * Review.
                   */
                  <div className="upload-progress">
                    <div
                      className="upload-progress-spinner"
                      aria-hidden="true"
                    />

                    <div className="upload-progress-text">
                      Uploading your dataset…
                    </div>

                    <div className="upload-progress-sub">
                      This can take a moment for larger
                      files.
                    </div>
                  </div>
                ) : !upload ? (
                  <UploadZone
                    onFileSelected={
                      file
                    }
                    disabled={
                      loading
                    }
                  />
                ) : (
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
                )}

                {upload && !loading && (
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
              DATASET REVIEW
          ================================================= */}

          {!isSettingsPage &&
            active &&
            isReview && (
              <section>
                <div className="workspace-intro">
                  <div>
                    <div className="section-kicker">
                      02 · DATASET REVIEW
                    </div>

                    <h1>
                      Check the cleanup before you analyse.
                    </h1>

                    <p>
                      Adanse only applies conservative,
                      automatic cleaning steps. Validate the
                      report below, then activate this
                      version to unlock the analysis plan.
                    </p>
                  </div>
                </div>

                <DatasetReview
                  version={datasetVersion}
                  active={Boolean(
                    project?.active_dataset_version_id &&
                      datasetVersion &&
                      project.active_dataset_version_id ===
                        datasetVersion.id
                  )}
                  onValidate={validateDataset}
                  onActivate={activateDataset}
                  onApplyGroupings={applyGroupings}
                  onReplace={() =>
                    replaceInputRef.current?.click()
                  }
                  loading={loading}
                  error={error}
                />
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
                onQualitativeFinalized={
                  onQualitativeFinalized
                }
                loading={
                  loading
                }
                conversationId={
                  active.id
                }
                credits={credits}
                costs={costs}
                onBuyCredits={
                  openCredits
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
                datasetVersion={datasetVersion}
                onBack={
                  backToAnalysis
                }
                onDownload={
                  download
                }
                loading={
                  loading
                }
                credits={credits}
                costs={costs}
                onBuyCredits={
                  openCredits
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
