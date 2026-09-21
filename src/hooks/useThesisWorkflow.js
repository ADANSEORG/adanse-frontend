import { useEffect, useState } from "react";

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
  listDatasetVersions,
  getDatasetVersion,
  validateDatasetVersion,
  activateDatasetVersion,
  applyDatasetGroupings,
  saveCategoryOrder,
  clearCategoryOrder,
  buildAnalysisPlan,
  selectQualitativeColumns,
  overrideAnalysisVariables,
  runThesisAnalysis,
  downloadChapter4,
  getCredits,
} from "../api.js";

import { friendly } from "../errors.js";

/*
 * ---------------------------------------------------------
 * ASYNC ACTION HELPER
 * ---------------------------------------------------------
 *
 * Every handler below follows the same shape: flip a busy
 * flag, clear the error, run the async work, map any
 * failure through friendly(), then clear the busy flag.
 * This captures that shape once so each handler only states
 * what's different about it.
 *
 * onError is optional. If it returns true, the failure was
 * already handled (e.g. setError was already called with a
 * more specific message) and the generic friendly(e) is
 * skipped.
 */
async function runAction({ setBusy, setError, action, onError }) {
  setBusy(true);
  setError("");

  try {
    await action();
  } catch (e) {
    const handled = onError ? await onError(e) : false;

    if (!handled) {
      setError(friendly(e));
    }
  } finally {
    setBusy(false);
  }
}

/*
 * ---------------------------------------------------------
 * useThesisWorkflow
 * ---------------------------------------------------------
 *
 * Owns every piece of state and every handler behind the
 * thesis workflow: conversations, the active project, the
 * dataset/plan/analysis pipeline, and step navigation.
 * App.jsx only decides which screen to render from what
 * this returns.
 */
export function useThesisWorkflow({ user, authLoading }) {
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
   * The cleaned dataset version currently under review
   * (status: cleaned -> validated -> activated). Populated
   * right after upload, or when a project is reopened with
   * an un-activated cleaned version pending.
   */
  const [
    datasetVersion,
    setDatasetVersion,
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
   * Per-action credit costs (e.g. { analysis: 50, chapter4: 50 }), read
   * from the same GET /api/v1/credits response as the balance itself --
   * never hardcoded here, since that's the same class of bug as the
   * hardcoded free-credit number fixed elsewhere in this app.
   */
  const [
    costs,
    setCosts,
  ] = useState({});

  /*
   * IMPORTANT:
   *
   * setup     = Research
   * upload    = Dataset
   * review    = Dataset review (validate + activate)
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
      setCosts({});
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

          setCosts(
            creditData?.costs || {}
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

    await runAction({
      setBusy: setCreating,
      setError,
      action: async () => {
        const c = await createConversation();

        await createThesisProject({
          conversation_id: c.id,
          title: "Untitled research",
          objectives: [],
          research_questions: [],
          hypotheses: [],
          methodology: "",
        });

        setConversations((x) => [c, ...x]);
        setActive(c);
        setProject(await getThesisProject(c.id));

        setMessages([]);
        setUpload(null);
        setPlan(null);
        setAnalysis(null);

        setStep("setup");
        setSidebarOpen(false);
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * SELECT CONVERSATION
   * ---------------------------------------------------------
   */

  const select = async (c) => {
    await runAction({
      setBusy: setLoading,
      setError,
      action: async () => {
        const [fresh, msg] = await Promise.all([
          getConversation(c.id),
          listMessages(c.id),
        ]);

        let p;

        try {
          p = await getThesisProject(c.id);
        } catch (e) {
          if (e?.status !== 404) {
            throw e;
          }

          p = await createThesisProject({
            conversation_id: c.id,
            title: fresh.title || "Untitled research",
            objectives: [],
            research_questions: [],
            hypotheses: [],
            methodology: "",
          });
        }

        setActive(fresh);
        setMessages(msg.messages || []);
        setProject(p);
        setPlan(p.analysis_plan || null);
        setAnalysis(p.analysis_results || null);

        setUpload(
          p.dataset_path
            ? {
                dataset_filename: p.dataset_filename,
                dataset_rows: p.dataset_rows,
                dataset_columns: p.dataset_columns,
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
         * Dataset activated (active_dataset_version_id set):
         *     Dataset screen.
         *
         * Dataset uploaded but not yet reviewed/activated:
         *     Dataset review screen.
         *
         * Otherwise:
         *     Research screen.
         */

        if (p.analysis_results) {
          setStep("workspace");
        } else if (p.analysis_plan) {
          setStep("workspace");
        } else if (p.dataset_path && p.active_dataset_version_id) {
          setStep("upload");
        } else if (p.dataset_path) {
          const routed = await goReviewPendingDataset(c.id).catch(() => false);

          if (!routed) {
            setStep("upload");
          }
        } else {
          setStep("setup");
        }

        setSidebarOpen(false);
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * SAVE RESEARCH CONTEXT
   * ---------------------------------------------------------
   */

  const saveSetup = async (data) => {
    await runAction({
      setBusy: setLoading,
      setError,
      action: async () => {
        let c = active;

        if (!c) {
          c = await createConversation(data.title.slice(0, 80));

          setActive(c);
          setConversations((x) => [c, ...x]);

          await createThesisProject({
            conversation_id: c.id,
            ...data,
          });
        } else {
          await updateThesisProject(c.id, data);

          if (
            c.title === "New Analysis" ||
            c.title === "Untitled research"
          ) {
            const updated = await updateConversation(
              c.id,
              data.title.slice(0, 80)
            );

            setActive(updated);

            setConversations((x) =>
              x.map((v) => (v.id === updated.id ? updated : v))
            );
          }
        }

        const p = await getThesisProject(c.id);

        setProject(p);
        setStep("upload");
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * UPLOAD DATASET
   * ---------------------------------------------------------
   */

  const file = async (f) => {
    await runAction({
      setBusy: setLoading,
      setError,
      action: async () => {
        let conversation = active;

        if (!conversation) {
          conversation = await createConversation(
            project?.title || "Untitled research"
          );

          await createThesisProject({
            conversation_id: conversation.id,
            ...(project || {
              title: "Untitled research",
              objectives: [],
              research_questions: [],
              hypotheses: [],
              methodology: "",
            }),
          });

          setActive(conversation);
          setConversations((x) => [conversation, ...x]);
        }

        const id = conversation.id;
        const d = await uploadThesisDataset(id, f);

        setUpload(d);
        setProject(await getThesisProject(id));

        /*
         * Upload complete, but the cleaned candidate is not
         * active yet. Load it so the researcher can review the
         * cleaning report, then validate and activate it.
         */
        if (d?.dataset_version_id) {
          const versionDetail = await getDatasetVersion(
            id,
            d.dataset_version_id
          );

          setDatasetVersion(versionDetail.version);
          setStep("review");
        } else {
          // Legacy projects without dataset versioning fall
          // back to the old direct-to-analysis flow.
          setStep("workspace");
        }
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * VALIDATE DATASET VERSION
   * ---------------------------------------------------------
   */

  const validateDataset = async () => {
    if (!active || !datasetVersion) return;

    await runAction({
      setBusy: setLoading,
      setError,
      action: async () => {
        const result = await validateDatasetVersion(
          active.id,
          datasetVersion.id
        );

        setDatasetVersion(result.version);
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * APPLY CONFIRMED GROUPINGS
   *
   * Creates a new cleaned dataset version — it never mutates
   * datasetVersion in place. The new version still needs its
   * own validate + activate before analysis can use it.
   * ---------------------------------------------------------
   */

  const applyGroupings = async (groupings) => {
    if (!active || !datasetVersion) return;

    /*
     * No busy flag here — DatasetReview.jsx tracks its own
     * "applyingGroupings" state for this action's button, same
     * as before this was extracted into runAction.
     */
    await runAction({
      setBusy: () => {},
      setError,
      action: async () => {
        const result = await applyDatasetGroupings(
          active.id,
          datasetVersion.id,
          groupings
        );

        setDatasetVersion(result.version);
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * SAVE / CLEAR A COLUMN'S MANUAL CATEGORY ORDER
   *
   * Display only — updates the same dataset version in place
   * (no new version is created, unlike apply-groupings), since
   * this never touches the stored dataframe.
   * ---------------------------------------------------------
   */

  const saveColumnCategoryOrder = async (column, order) => {
    if (!active || !datasetVersion) return;

    await runAction({
      setBusy: () => {},
      setError,
      action: async () => {
        const result = await saveCategoryOrder(
          active.id,
          datasetVersion.id,
          column,
          order
        );

        setDatasetVersion(result.version);
      },
    });
  };

  const clearColumnCategoryOrder = async (column) => {
    if (!active || !datasetVersion) return;

    await runAction({
      setBusy: () => {},
      setError,
      action: async () => {
        const result = await clearCategoryOrder(
          active.id,
          datasetVersion.id,
          column
        );

        setDatasetVersion(result.version);
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * ACTIVATE DATASET VERSION
   * ---------------------------------------------------------
   */

  const activateDataset = async () => {
    if (!active || !datasetVersion) return;

    await runAction({
      setBusy: setLoading,
      setError,
      action: async () => {
        await activateDatasetVersion(active.id, datasetVersion.id);

        /*
         * Activation supersedes any prior active version and
         * clears the project's existing analysis plan/results,
         * so refresh everything from the server rather than
         * patching local state.
         */
        const refreshed = await getThesisProject(active.id);

        setProject(refreshed);

        setUpload({
          dataset_filename: refreshed.dataset_filename,
          dataset_rows: refreshed.dataset_rows,
          dataset_columns: refreshed.dataset_columns,
        });

        setDatasetVersion((v) => (v ? { ...v, status: "validated" } : v));

        setPlan(null);
        setAnalysis(null);

        setStep("workspace");
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * LOAD PENDING DATASET VERSION
   * ---------------------------------------------------------
   *
   * Finds the most recent cleaned version that is not yet the
   * project's active version and opens the review stage for
   * it. Used when the backend refuses to build an analysis
   * plan (409) and when reopening a project left mid-review.
   */

  const goReviewPendingDataset = async (
    conversationId
  ) => {
    const { versions } =
      await listDatasetVersions(
        conversationId
      );

    const pending = (versions || []).find(
      (v) =>
        v.kind === "cleaned" &&
        (v.status === "cleaned" ||
          v.status === "validated")
    );

    if (pending) {
      setDatasetVersion(pending);
      setStep("review");
      return true;
    }

    return false;
  };

  /*
   * ---------------------------------------------------------
   * BUILD ANALYSIS PLAN
   * ---------------------------------------------------------
   */

  const build = async () => {
    if (!active) return;

    await runAction({
      setBusy: setLoading,
      setError,
      action: async () => {
        const p = await buildAnalysisPlan(active.id);

        setPlan(p);
        setProject(await getThesisProject(active.id));
        setStep("workspace");
      },
      onError: async (e) => {
        /*
         * The dataset exists but has not been validated and
         * activated yet. Send the researcher back to review it
         * instead of just showing an error.
         */
        if (e?.status === 409) {
          const routed = await goReviewPendingDataset(active.id).catch(
            () => false
          );

          if (routed) {
            setError(friendly(e));
            return true;
          }
        }

        return false;
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * QUALITATIVE DATA SOURCES
   *
   * "Which qualitative data should be analysed?" -- a project-wide choice
   * confirmed once, independent of any objective. columnObjectives is a
   * separate, optional researcher-declared signal alongside it -- which
   * objective(s) each selected column was designed to inform -- never
   * required, never inferred. Updates `plan` in place with the server's
   * confirmed plan.qualitative (selected_columns + column_objectives) so
   * ThesisWorkspace re-renders from the source of truth rather than
   * trusting the checkboxes' own local state.
   * ---------------------------------------------------------
   */

  const confirmQualitativeColumns = async (columns, columnObjectives) => {
    if (!active) return;

    await runAction({
      setBusy: setLoading,
      setError,
      action: async () => {
        const p = await selectQualitativeColumns(active.id, columns, columnObjectives);
        setPlan(p);
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * ANALYSIS OVERRIDE
   *
   * Replaces one objective's plan-time analysis with variables the
   * researcher chose directly -- server-validated, never re-scored
   * client-side. Updates `plan` in place with the server's response,
   * same pattern as confirmQualitativeColumns above.
   * ---------------------------------------------------------
   */

  const overrideAnalysis = async (objectiveId, override) => {
    if (!active) return;

    await runAction({
      setBusy: setLoading,
      setError,
      action: async () => {
        const { plan: p, analysis_results: updatedAnalysis } =
          await overrideAnalysisVariables(active.id, objectiveId, override);
        setPlan(p);
        // null means nothing existed to flag stale yet (analysis never
        // run) -- leave `analysis` state as-is rather than clearing it.
        if (updatedAnalysis) {
          setAnalysis(updatedAnalysis);
        }
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * RUN ANALYSIS
   * ---------------------------------------------------------
   */

  const run = async () => {
    if (!active) return;

    await runAction({
      setBusy: setLoading,
      setError,
      action: async () => {
        const a = await runThesisAnalysis(active.id);

        setAnalysis(a);

        /*
         * Backend returns the new balance
         * after a successful analysis.
         */
        if (a?.credits_remaining !== undefined) {
          setCredits(Number(a.credits_remaining));
        }

        setProject(await getThesisProject(active.id));

        /*
         * STAY ON ANALYSIS.
         *
         * Do NOT jump to Chapter 4 automatically.
         *
         * The user needs to review the findings first.
         */
        setStep("workspace");

        const completed = Array.isArray(a?.objective_results)
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
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * QUALITATIVE REVIEW (Braun & Clarke phases 3-6)
   * ---------------------------------------------------------
   *
   * Finalizing a column updates just that one entry in
   * `analysis.qualitative_results` (the flat, column-keyed list --
   * see run_plan()/finalize_qualitative_column() on the backend) in
   * place. Qualitative results are never nested under an objective, so
   * there is no objective_results tree to patch here.
   */

  const onQualitativeFinalized = (outcome) => {
    if (!outcome?.column) return;

    setAnalysis((prev) => {
      if (!prev) return prev;

      const existing = prev.qualitative_results || [];
      const found = existing.some((entry) => entry.column === outcome.column);
      const qualitativeResults = found
        ? existing.map((entry) => (entry.column === outcome.column ? outcome : entry))
        : [...existing, outcome];

      return {
        ...prev,
        qualitative_results: qualitativeResults,
      };
    });
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
   * DELETE CONVERSATION
   * ---------------------------------------------------------
   */

  const deleteChat = async (c) => {
    await runAction({
      setBusy: () => {},
      setError,
      action: async () => {
        await deleteConversation(c.id);

        setConversations((x) => x.filter((v) => v.id !== c.id));

        if (active?.id === c.id) {
          setActive(null);
          setProject(null);
          setUpload(null);
          setPlan(null);
          setAnalysis(null);
          setMessages([]);
          setStep("setup");
        }
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * DOWNLOAD CHAPTER 4
   * ---------------------------------------------------------
   */

  const download = async () => {
    if (!active) return;

    await runAction({
      setBusy: setLoading,
      setError,
      action: async () => {
        /*
         * api.js returns both the
         * DOCX blob and the credit
         * headers from the backend.
         */
        const result = await downloadChapter4(active.id);

        const url = URL.createObjectURL(result.blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = "adanse-chapter-4.docx";

        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(url);

        /*
         * Backend returns the
         * remaining balance through
         * X-Credits-Remaining.
         */
        if (result.creditsRemaining !== undefined) {
          setCredits(Number(result.creditsRemaining));
        }
      },
    });
  };

  return {
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
    saveColumnCategoryOrder,
    clearColumnCategoryOrder,
    activateDataset,
    build,
    confirmQualitativeColumns,
    overrideAnalysis,
    run,
    onQualitativeFinalized,
    goToChapter4,
    backToAnalysis,
    openAccount,
    backFromAccount,
    openCredits,
    backFromCredits,
    download,
  };
}
