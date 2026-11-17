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
import Chapter1Compare from "./components/Chapter1Compare.jsx";
import Stepper from "./components/Stepper.jsx";
import Skeleton, {
  SkeletonLines,
} from "./components/Skeleton.jsx";
import { useDelayedLoading } from "./hooks/useDelayedLoading.js";
import { chapter4Gate } from "./chapter4Gate.js";
import { withConversationProgress } from "./sidebarGroups.js";

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
    loading,
    busyActions,
    error,
    setError,
    sidebarOpen,
    setSidebarOpen,
    creating,

    newChat,
    select,
    deleteChat,
    pinChat,
    unpinChat,
    saveSetup,
    file,
    continueFromDataset,
    validateDataset,
    applyGroupings,
    declareTypes,
    reverseScores,
    saveColumnCategoryOrder,
    clearColumnCategoryOrder,
    uploadChapter1,
    removeChapter1,
    adoptChapter1Wording,
    rememberChapterFile,
    activateDataset,
    build,
    confirmQualitativeColumns,
    overrideAnalysis,
    run,
    onQualitativeFinalized,
    goToChapter4,
    backToAnalysis,
    backToSetup,
    backFromAnalysis,
    settingsView,
    leaveSettings,
    openAccount,
    backFromAccount,
    openCredits,
    backFromCredits,
    download,
  } = useThesisWorkflow({ user, authLoading });

  const replaceInputRef =
    useRef(null);

  const showUploadSkeleton =
    useDelayedLoading(
      step === "upload" && loading
    );

  // Signing out from Account (or the sidebar menu) must not leave /account in
  // the address bar, or the next person to sign in would land on it.
  async function handleSignOut() {
    await signOut();
    leaveSettings();
  }

  /*
   * ---------------------------------------------------------
   * AUTH LOADING
   * ---------------------------------------------------------
   */

  if (authLoading) {
    return (
      // Only while a sign-in or reset link in the URL is processed (see
      // sessionBootstrap.js); otherwise the app or sign-in screen shows at once.
      <div
        className="loading-screen"
        role="status"
        aria-label="Loading"
      >
        <div className="auth-skeleton">
          <Skeleton width="180px" height="22px" />
          <SkeletonLines lines={2} />
          <Skeleton width="100%" height="36px" />
          <Skeleton width="100%" height="36px" />
          <Skeleton width="120px" height="34px" />
        </div>
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

  // Account and Credits are decided by the URL (/account, /credits), not by
  // `step`; see useThesisWorkflow.
  const isAccount =
    settingsView === "account";

  const isCredits =
    settingsView === "credits";

  const isSettingsPage =
    isAccount || isCredits;

  const chapter4Access = chapter4Gate(analysis);

  const currentStepIndex = isChapter4
    ? 3
    : isAnalysis
    ? 2
    : isDataset || isReview
    ? 1
    : 0;

  const goToResearchStep = () => {
    if (!active) return;

    backToSetup();
  };

  const goToDatasetStep = () => {
    if (!active) return;

    if (isAnalysis) {
      backFromAnalysis();
    }
  };

  const goToAnalysisStep = () => {
    if (!active) return;

    if (isChapter4) {
      backToAnalysis();
    }
  };

  const steps = [
    {
      key: "research",
      label: "Research",
      available: Boolean(active),
    },
    {
      key: "dataset",
      label: "Dataset",
      available:
        Boolean(active) && isAnalysis,
      lockedReason:
        isChapter4
          ? "Go back to Analysis to revisit the dataset."
          : "Add a dataset to unlock this step.",
    },
    {
      key: "analysis",
      label: "Analysis",
      available:
        Boolean(active) && isChapter4,
      lockedReason:
        "Run the analysis to unlock this step.",
    },
    {
      key: "chapter4",
      label: "Chapter 4",
      available: false,
      lockedReason:
        "Complete the analysis to unlock Chapter 4.",
    },
  ];

  const stepHandlers = {
    research: goToResearchStep,
    dataset: goToDatasetStep,
    analysis: goToAnalysisStep,
  };

  const handleStepClick = (key) => {
    stepHandlers[key]?.();
  };

  const studyStatus = isChapter4
    ? "Chapter 4 ready"
    : isAnalysis
    ? analysis
      ? "Analysed"
      : "Dataset added"
    : isReview
    ? "Dataset added"
    : isDataset
    ? upload
      ? "Dataset added"
      : "Draft"
    : "Draft";

  const projectTitle = isSettingsPage
    ? isAccount
      ? "Account"
      : "Credits"
    : project?.title ||
      active?.title ||
      "New analysis";

  // The conversations endpoint does not carry workflow state, so the active
  // row takes its status tag from the screen the researcher is on.
  const sidebarConversations = conversations.map(
    (conversation) =>
      conversation.id === active?.id
        ? withConversationProgress(
            conversation,
            {
              datasetUploaded: Boolean(upload),
              analysisReady: Boolean(analysis),
              chapter4Ready: isChapter4,
            }
          )
        : conversation
  );

  return (
    <div className="app-layout">
      {showWelcome && (
        <WelcomeModal onDismiss={dismissWelcome} />
      )}

      <ConversationSidebar
        conversations={
          sidebarConversations
        }
        activeId={
          active?.id
        }
        loading={loading}
        error={null}
        creating={creating}
        onNewChat={newChat}
        onSelect={select}
        onDelete={deleteChat}
        onPin={pinChat}
        onUnpin={unpinChat}
        user={user}
        onAccount={
          openAccount
        }
        onCredits={
          openCredits
        }
        credits={credits}
        onSignOut={
          handleSignOut
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
            TOP BAR
        ===================================================== */}

        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-project">
              <button
                className="sidebar-toggle"
                onClick={() =>
                  setSidebarOpen(
                    true
                  )
                }
                type="button"
              >
                Menu
              </button>

              <div className="topbar-copy">
                <span className="topbar-title">
                  {projectTitle}
                </span>

                {!isSettingsPage && (
                  <span className="topbar-subtitle">
                    {active
                      ? studyStatus
                      : "Draft"}
                  </span>
                )}
              </div>
            </div>

            {!isSettingsPage && (
              <div className="topbar-actions">
                <Stepper
                  steps={steps}
                  current={currentStepIndex}
                  onNavigate={handleStepClick}
                />

                {isAnalysis && analysis && (
                  <button
                    type="button"
                    className="flow-continue"
                    onClick={goToChapter4}
                    disabled={
                      chapter4Access.blocked
                    }
                    title={
                      chapter4Access.blocked
                        ? chapter4Access.message
                        : undefined
                    }
                  >
                    Continue to Chapter 4
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

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
                handleSignOut
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
                onChapterFile={
                  rememberChapterFile
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
                onChapterFile={
                  rememberChapterFile
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
                <header className="page-head">
                  <h1 className="page-title">
                    Dataset
                  </h1>

                  <p className="page-help">
                    Upload the CSV or Excel file
                    behind your thesis. Adanse profiles
                    it before choosing any analysis.
                  </p>
                </header>

                {loading ? (
                  /*
                   * Covers both the first upload and a "Replace
                   * dataset" re-upload. The status line shows at
                   * once; the preview skeleton only appears if the
                   * wait passes 200ms (useDelayedLoading).
                   */
                  <div className="upload-progress">
                    <div className="upload-progress-text">
                      Uploading your dataset…
                    </div>

                    <div className="upload-progress-sub">
                      This can take a moment for larger
                      files.
                    </div>

                    {showUploadSkeleton && (
                      <div
                        className="dataset-skeleton"
                        role="status"
                        aria-label="Preparing dataset preview"
                      >
                        {Array.from(
                          { length: 8 },
                          (_, index) => (
                            <div
                              className="dataset-skeleton-row"
                              key={index}
                            >
                              <Skeleton width="18%" />
                              <Skeleton width="32%" />
                              <Skeleton width="24%" />
                            </div>
                          )
                        )}
                      </div>
                    )}
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
                        Current dataset
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
                        onClick={
                          continueFromDataset
                        }
                        disabled={
                          loading ||
                          Boolean(busyActions.continue)
                        }
                      >
                        Continue →
                      </button>
                    </div>
                  </div>
                )}

                {/* Independent of the dataset upload: either,
                    both, or one then the other. Stays visible (but
                    locked) while a dataset uploads. */}
                <Chapter1Compare
                  project={project}
                  onUpload={uploadChapter1}
                  onRemove={removeChapter1}
                  onUseWording={adoptChapter1Wording}
                  disabled={loading}
                />

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
                <header className="page-head">
                  <h1 className="page-title">
                    Dataset review
                  </h1>

                  <p className="page-help">
                    Adanse only applies conservative,
                    automatic cleaning steps. Validate the
                    report below, then activate this
                    version to unlock the analysis plan.
                  </p>
                </header>

                <DatasetReview
                  version={datasetVersion}
                  active={Boolean(
                    project?.active_dataset_version_id &&
                      datasetVersion &&
                      project.active_dataset_version_id ===
                        datasetVersion.id
                  )}
                  costs={costs}
                  onValidate={validateDataset}
                  onActivate={activateDataset}
                  onApplyGroupings={applyGroupings}
                  onDeclareColumnTypes={declareTypes}
                  onSetReverseScores={reverseScores}
                  onSaveCategoryOrder={saveColumnCategoryOrder}
                  onClearCategoryOrder={clearColumnCategoryOrder}
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
                onConfirmQualitativeColumns={
                  confirmQualitativeColumns
                }
                onOverrideAnalysis={
                  overrideAnalysis
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
                busyActions={
                  busyActions
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
