import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  listConversations,
  createConversation,
  deleteConversation,
  pinConversation,
  unpinConversation,
  getConversation,
  listMessages,
  addMessage,
  updateConversation,
  createThesisProject,
  getThesisProject,
  updateThesisProject,
  uploadThesisDataset,
  uploadChapter1Document,
  removeChapter1Document,
  listDatasetVersions,
  getDatasetVersion,
  validateDatasetVersion,
  activateDatasetVersion,
  applyDatasetGroupings,
  declareColumnTypes,
  setReverseScores,
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
import { finalizeConfirmationMessage } from "../qualitativeFinalizePolling.js";
import { withPinnedAt } from "../sidebarGroups.js";
import { chapter4Gate } from "../chapter4Gate.js";
import {
  pathForSettingsView,
  settingsBackTarget,
  settingsViewForPath,
} from "../viewRoutes.js";
import {
  defaultProjectStep,
  historyBackTarget,
  stepPushState,
  isProjectStep,
  isValidProjectId,
  parseProjectPath,
  projectPath,
  redirectNotice,
  resolveProjectStep,
} from "../projectRoutes.js";
import {
  clearLastVisited,
  getLastVisited,
  setLastVisited,
} from "../lastVisited.js";

/*
 * Route step names (projectRoutes.js's PROJECT_STEPS) <-> this file's own,
 * pre-existing internal step names. Kept as an explicit, narrow translation
 * at the URL boundary below rather than renaming `step`'s values everywhere
 * (every isResearch/isDataset/... derivation in App.jsx, every setStep call
 * in this file) -- that rename is not this stage's job, and this keeps the
 * diff to exactly the setup/dataset wiring described in the PR.
 */
const ROUTE_STEP_OF = {
  setup: "setup",
  upload: "dataset",
  review: "review",
  workspace: "analysis",
  chapter4: "chapter4",
};
const INTERNAL_STEP_OF = {
  setup: "setup",
  dataset: "upload",
  review: "review",
  analysis: "workspace",
  chapter4: "chapter4",
};


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
  /*
   * Account and Credits are routes (/account, /credits): the URL, not `step`,
   * says whether one is showing, so a reload or a new tab stays on it and the
   * browser's Back button leaves it. The project `step` below is untouched
   * while one is open, so Back returns to exactly the screen that was up.
   */
  const navigate = useNavigate();
  const location = useLocation();
  const settingsView = settingsViewForPath(location.pathname);

  // Every push of a project step goes through here, recording the page it was
  // pushed from in the new entry's history state. The in-page Back then steps
  // history back only when that page IS the logical previous step, and pushes
  // the step otherwise (spec section 10; see projectRoutes.js's
  // historyBackTarget). Replaces record nothing: they are corrections, not a
  // place the user came from.
  const pushStep = (path) => {
    navigate(path, { state: stepPushState(location.pathname) });
  };

  // Leave a settings page for the project view (choosing or creating a
  // project). Replaces the entry so Back doesn't return to the settings page
  // the user just left.
  const leaveSettings = () => {
    if (settingsView) {
      navigate("/", { replace: true });
    }
  };

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
   *
   * (Account and Credits are not steps: see settingsView above.)
   */
  const [
    step,
    setStep,
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
        leaveSettings();

        // "New analysis | push /project/:newId/setup" -- a genuinely new
        // history entry, since this is a fresh, user-initiated navigation.
        pushStep(projectPath(c.id, "setup"));
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * SELECT CONVERSATION
   * ---------------------------------------------------------
   *
   * Also the URL-restore entry point (see the two effects below this
   * function): a reload, a deep link, or the browser's Back/Forward button
   * landing on /project/:id[/:step] calls this the same way a sidebar click
   * does, just with `push: false` (nothing new to add to history -- the
   * browser already has an entry for wherever it landed) and, when the URL
   * named an explicit step, `requestedStep` so a bookmark is honoured
   * rather than silently overridden by the project's current default.
   *
   * `requestedStep` is only ever acted on when it is one of the five
   * PROJECT_STEPS names (isProjectStep). Anything else (an unrecognised
   * name, or none) falls through to the same defaultProjectStep() this
   * function has always used, unchanged from before this file knew about
   * routing at all.
   */

  const select = async (c, { push = true, requestedStep = null } = {}) => {
    await runAction({
      setBusy: setLoading,
      setError,
      action: async () => {
        /*
         * getThesisProject(c.id) needs only c.id -- already known before
         * this function starts -- so it has no reason to wait for
         * getConversation/listMessages to resolve first. It used to (a
         * plain `await` after their Promise.all), which on a reload/deep
         * link serialises the single slowest of the three calls after
         * the other two instead of overlapping it with them; measured on
         * a production trace, that tail alone was the dominant cost of
         * the reload's blank-page time.
         *
         * Its expected failure (the project doesn't exist yet, 404) is
         * resolved to a sentinel here rather than left to throw, so it
         * doesn't fail the whole Promise.all group the way an unhandled
         * rejection would -- the same outcome the old try/catch produced,
         * just without forcing this call to run alone, after the others,
         * to get it. Any OTHER error still rejects (unchanged: it was
         * already rethrown here before, and still propagates to
         * runAction's onError exactly as getConversation/listMessages'
         * own failures always have).
         */
        const [fresh, msg, projectOutcome] = await Promise.all([
          getConversation(c.id),
          listMessages(c.id),
          getThesisProject(c.id).then(
            (project) => ({ project }),
            (error) => {
              if (error?.status !== 404) {
                throw error;
              }

              return { notFound: true };
            }
          ),
        ]);

        const p = projectOutcome.notFound
          ? await createThesisProject({
              conversation_id: c.id,
              title: fresh.title || "Untitled research",
              objectives: [],
              research_questions: [],
              hypotheses: [],
              methodology: "",
            })
          : projectOutcome.project;

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
         * Decide where the user should land -- same priority order as
         * before (results > plan > active dataset > pending review >
         * setup), now expressed once as defaultProjectStep() so this and
         * the URL-restore effects below agree by construction.
         *
         * The versions list is fetched in the one case it was always
         * fetched for (dataset uploaded, not yet active -- the only way
         * defaultProjectStep's own routing can land on "review"), PLUS
         * whenever "review" is explicitly requested: a project can already
         * have an active version and STILL have a newer pending one (a
         * re-grouping or a declared-type change after activation creates a
         * fresh version needing its own review -- see backend #67), and a
         * bookmark or reload landing on /review needs to know about that
         * even though the default-routing case above never would.
         */
        let hasPendingReviewVersion = false;
        let pendingVersion = null;

        if ((p.dataset_path && !p.active_dataset_version_id) || requestedStep === "review") {
          const { versions } = await listDatasetVersions(c.id).catch(() => ({ versions: [] }));

          pendingVersion =
            (versions || []).find(
              (v) => v.kind === "cleaned" && (v.status === "cleaned" || v.status === "validated")
            ) || null;

          hasPendingReviewVersion = Boolean(pendingVersion);
        }

        /*
         * A bookmark or reload naming one of the five routed steps
         * explicitly is honoured (resolveProjectStep) rather than
         * overridden by the default: setup/dataset are unconditionally
         * allowed (mostly future-proofing, see resolveProjectStep's own
         * comment); review/analysis are corrected back to dataset when the
         * project's current data doesn't support them (a stale bookmark to
         * /review once the pending version has been resolved, say);
         * chapter4 is corrected the same way goToChapter4() has always
         * gated it -- chapter4Gate(p.analysis_results), the FRESHLY loaded
         * results, not whatever the `analysis` state variable currently
         * holds, so a reload re-checks against the server's current state
         * rather than trusting a stale local copy. Its own message (which
         * source is unfinalized, or that results are stale) is shown
         * instead of redirectNotice's generic copy for that reason.
         * Anything else (an unrecognised step, or none) uses the same
         * default this function has always used.
         */
        let routeStep;
        let notice = null;

        if (isProjectStep(requestedStep)) {
          const facts = { hasPendingReviewVersion };
          let gate = null;

          if (requestedStep === "chapter4") {
            gate = chapter4Gate(p.analysis_results || null);
            facts.chapter4Blocked = gate.blocked;
          }

          const resolved = resolveProjectStep(requestedStep, p, facts);

          routeStep = resolved.step;

          if (resolved.redirected) {
            notice = resolved.reason === "chapter4-blocked" ? gate.message : redirectNotice(resolved.reason);
          }
        } else {
          routeStep = defaultProjectStep(p, { hasPendingReviewVersion });
        }

        if (routeStep === "review" && pendingVersion) {
          setDatasetVersion(pendingVersion);
        }

        setStep(INTERNAL_STEP_OF[routeStep]);

        if (notice) {
          setError(notice);
        }

        setLastVisited(user.id, fresh.id, routeStep);

        setSidebarOpen(false);
        leaveSettings();

        // routeStep is always one of the five PROJECT_STEPS names (from
        // resolveProjectStep or defaultProjectStep above), so it always
        // gets its own persisted sub-path -- the last of the five, chapter4,
        // joined the other four in this PR.
        const targetPath = projectPath(fresh.id, routeStep);

        if (location.pathname !== targetPath) {
          if (push) {
            pushStep(targetPath);
          } else {
            navigate(targetPath, { replace: true });
          }
        }
      },
      onError: async (e) => {
        /*
         * The conversation was deleted, or never belonged to this
         * account (R2): clear it out, drop any last-visited pointer to
         * it so a later bare "/" doesn't retry it, and land on the main
         * page with a one-time notice instead of a generic error banner.
         */
        if (e?.status === 404) {
          setActive(null);
          setProject(null);
          setUpload(null);
          setPlan(null);
          setAnalysis(null);
          setMessages([]);
          setDatasetVersion(null);
          setStep("setup");

          clearLastVisited(user.id);
          navigate("/", { replace: true });
          setError("That project isn't available.");

          return true;
        }

        return false;
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * RESTORE FROM THE URL
   * ---------------------------------------------------------
   *
   * Two effects, mutually exclusive by construction (one only acts on
   * /project/:id[...], the other only on exactly "/"):
   *
   * 1. /project/:id[/:step] -- a reload, a deep link, or the browser's
   *    Back/Forward button landing here. A malformed id makes no request
   *    (R1). Everything else routes through select(), the same function a
   *    sidebar click uses, with push:false (there is already a history
   *    entry for wherever this is) and requestedStep from the URL.
   *
   *    The "already there" guard is what stops this from fighting with
   *    select()'s OWN navigate() calls above: every push/replace this file
   *    does is paired, in the same synchronous handler, with the matching
   *    setStep/setActive -- so by the time the URL changes, state already
   *    matches it, and this effect no-ops. It only does real work for a
   *    URL change THIS file didn't just cause: a fresh load, or a history
   *    pop (Back/Forward, including backToSetup's navigate(-1) branch,
   *    which deliberately sets no state itself and leans entirely on this
   *    effect to reconcile from wherever that pop actually lands).
   *
   * 2. Bare "/" -- decision: reopens the last project (localStorage, per
   *    user), on whatever step it was last at. Skipped once a project is
   *    already open (e.g. newChat/select just set one, or effect 1 already
   *    ran on the same render). No entry, or a project this account no
   *    longer has: nothing to restore, land on the blank new-project form
   *    as before this existed.
   */

  useEffect(() => {
    if (authLoading || !user) return;

    const parsed = parseProjectPath(location.pathname);
    if (!parsed) return;

    if (!isValidProjectId(parsed.id)) {
      clearLastVisited(user.id);
      setError("That project isn't available.");
      navigate("/", { replace: true });
      return;
    }

    const id = parsed.id.toLowerCase();
    const alreadyThere =
      active?.id === id &&
      (!parsed.step || INTERNAL_STEP_OF[parsed.step] === step);

    if (alreadyThere) return;

    select({ id }, { push: false, requestedStep: parsed.step });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, authLoading, user?.id]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (location.pathname !== "/") return;
    if (active) return;

    const last = getLastVisited(user.id);
    if (!last) return;

    select({ id: last.projectId }, { push: false, requestedStep: last.step });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, authLoading, user?.id]);

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
        setLastVisited(user.id, c.id, "dataset");

        // "Continue and step buttons | push" -- a fresh entry, so Back from
        // Dataset returns to Setup (see backToSetup below) rather than out
        // of the project entirely.
        pushStep(projectPath(c.id, "dataset"));
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
          setLastVisited(user.id, id, "review");
          pushStep(projectPath(id, "review"));
        } else {
          // Legacy projects without dataset versioning fall
          // back to the old direct-to-analysis flow.
          setStep("workspace");
          setLastVisited(user.id, id, "analysis");
          pushStep(projectPath(id, "analysis"));
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
   * DECLARE COLUMN TYPES (e.g. include a column that was left
   * out as personal data)
   *
   * Like applyGroupings, this creates a new cleaned dataset
   * version -- it never mutates datasetVersion in place -- and the
   * new version needs its own validate + activate.
   * ---------------------------------------------------------
   */

  const declareTypes = async (columns) => {
    if (!active || !datasetVersion) return;

    await runAction({
      setBusy: () => {},
      setError,
      action: async () => {
        const result = await declareColumnTypes(
          active.id,
          datasetVersion.id,
          columns
        );

        setDatasetVersion(result.version);
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * REVERSE-SCORE RATING QUESTIONS
   *
   * `columns` is every scored rating question that should end up
   * reversed. Like declareTypes, this creates a new cleaned dataset
   * version that needs its own validate + activate.
   * ---------------------------------------------------------
   */

  const reverseScores = async (columns) => {
    if (!active || !datasetVersion) return;

    await runAction({
      setBusy: () => {},
      setError,
      action: async () => {
        const result = await setReverseScores(
          active.id,
          datasetVersion.id,
          columns
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
   * CHAPTER 1 OBJECTIVES (OPTIONAL, COMPARISON ONLY)
   * ---------------------------------------------------------
   *
   * Errors are thrown to the caller (Chapter1Compare shows them next
   * to its own button) instead of the screen-wide error banner.
   */

  const setChapter1Objectives = (value) =>
    setProject((prev) =>
      prev ? { ...prev, chapter1_objectives: value } : prev
    );

  const uploadChapter1 = async (docFile) => {
    if (!active) return;

    const result = await uploadChapter1Document(active.id, docFile);

    setChapter1Objectives(result.chapter1_objectives);
  };

  const removeChapter1 = async () => {
    if (!active) return;

    await removeChapter1Document(active.id);

    setChapter1Objectives(null);
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
        setLastVisited(user.id, active.id, "analysis");
        pushStep(projectPath(active.id, "analysis"));
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
   * plan (409) -- its only remaining caller (select()'s own
   * URL-restore path finds a pending version itself, see above).
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
      setLastVisited(user.id, conversationId, "review");

      // The plan build the caller asked for was refused (409) because the
      // dataset needs review first -- a correction, not the destination
      // they asked for, so replace rather than push.
      navigate(projectPath(conversationId, "review"), { replace: true });

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
        setLastVisited(user.id, active.id, "analysis");
        pushStep(projectPath(active.id, "analysis"));
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

    /*
     * Finalizing a qualitative column charges credits on the backend at
     * the moment it STARTS (see start_qualitative_finalize()), not here
     * -- this local balance copy has been stale since then. Refresh it
     * now that the run has completed, so the "Continue to Chapter 4"
     * action bar's affordability check (see ThesisWorkspace.jsx) reads
     * the real remaining balance rather than a pre-finalize snapshot.
     *
     * Also posts a brief confirmation of what was actually charged into
     * the conversation log -- QualitativeReview.jsx (where the Finalize
     * button lives) unmounts almost immediately once this fires, so the
     * conversation log is the one place that reliably survives long
     * enough for the researcher to see it, rather than a silent
     * deduction only discoverable in transaction history.
     */
    getCredits()
      .then((data) => {
        const balance = Number(data?.balance || 0);
        setCredits(balance);
        setCosts(data?.costs || {});

        const confirmation = finalizeConfirmationMessage(outcome.column, outcome.chargedCredits, balance);
        if (confirmation && active) {
          addMessage(active.id, "assistant", confirmation).catch((e) => {
            console.error("Could not post finalize confirmation message:", e);
          });
        }
      })
      .catch((e) => {
        console.error("Could not refresh credits after finalizing:", e);
      });
  };

  /*
   * ---------------------------------------------------------
   * CHAPTER 4
   * ---------------------------------------------------------
   */

  const goToChapter4 =
    () => {
      if (!active) return;

      // Every way in -- the header link and the action bar -- passes through
      // here, so the shared rule is enforced once more at the door: not while
      // a qualitative finalize is running or a source is unfinalized, and not
      // while results are out of date (the server refuses the chapter then too).
      // select()'s URL-restore path applies the SAME rule (chapter4Gate) against
      // the freshly-loaded project on every reload/deep-link, so this local
      // check being based on the possibly-stale `analysis` state is fine: it
      // only has to be right for the click that just happened, not forever.
      if (chapter4Gate(analysis).blocked) return;

      setError("");
      setStep("chapter4");
      setLastVisited(user.id, active.id, "chapter4");

      // "Continue and step buttons | push".
      pushStep(projectPath(active.id, "chapter4"));
    };

  /*
   * ---------------------------------------------------------
   * BACK TO ANALYSIS
   * ---------------------------------------------------------
   *
   * History-aware, same shape as backFromReview/backFromAnalysis above.
   */

  const backToAnalysis =
    () => {
      if (!active) return;

      setError("");

      const target = historyBackTarget(window.history.state, projectPath(active.id, "analysis"));

      if (target === -1) {
        navigate(-1);
      } else {
        setStep("workspace");
        pushStep(target);
      }
    };

  /*
   * ---------------------------------------------------------
   * BACK TO SETUP / REVIEW / ANALYSIS (the header's Back button)
   * ---------------------------------------------------------
   *
   * History-aware, same shape as backFromSettings below: step history back
   * when there is an earlier in-app entry (which the URL-restore effect
   * then resolves state from -- see above), otherwise push the fallback
   * step directly (per the approved history table: "steps history back if
   * the previous entry is that route, otherwise pushes it"). The Chapter 4
   * Back branch is untouched -- chapter4 is not routed yet.
   */
  const backToSetup =
    () => {
      if (!active) return;

      setError("");

      const target = historyBackTarget(window.history.state, projectPath(active.id, "setup"));

      if (target === -1) {
        navigate(-1);
      } else {
        setStep("setup");
        pushStep(target);
      }
    };

  const backFromReview =
    () => {
      if (!active) return;

      setError("");

      const target = historyBackTarget(window.history.state, projectPath(active.id, "dataset"));

      if (target === -1) {
        navigate(-1);
      } else {
        setStep("upload");
        pushStep(target);
      }
    };

  // Analysis's Back target depends on whether a cleaned dataset version is
  // known: review if it is (the researcher can look at the cleaning report
  // again), dataset if not -- same rule the pre-routing code used.
  const backFromAnalysis =
    () => {
      if (!active) return;

      setError("");

      const fallbackStep = datasetVersion ? "review" : "dataset";
      const target = historyBackTarget(window.history.state, projectPath(active.id, fallbackStep));

      if (target === -1) {
        navigate(-1);
      } else {
        setStep(datasetVersion ? "review" : "upload");
        pushStep(target);
      }
    };

  /*
   * ---------------------------------------------------------
   * ACCOUNT / CREDITS
   * ---------------------------------------------------------
   *
   * These are routes (/account, /credits), not steps. Opening one pushes a
   * history entry, so the browser's Back button and the page's own Back button
   * both return to the previous entry. The selected project and its `step`
   * are not touched, so what comes back is exactly what was up before.
   */

  const openSettings =
    (view) => {
      const path = pathForSettingsView(view);

      setSidebarOpen(false);
      setError("");

      // Already there (e.g. Credits clicked while on Credits): don't stack a
      // duplicate entry.
      if (path && location.pathname !== path) {
        navigate(path);
      }
    };

  // The page's Back button. After a reload or a link opened in a new tab there
  // is no earlier entry of ours to go back to, so it goes to the main page
  // instead of leaving the app.
  const backFromSettings =
    () => {
      setError("");

      const target = settingsBackTarget(window.history.state);

      if (target === -1) {
        navigate(-1);
      } else {
        navigate(target, { replace: true });
      }
    };

  const openAccount =
    () => {
      openSettings("account");
    };

  const backFromAccount =
    backFromSettings;

  const openCredits =
    async () => {
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

      openSettings("credits");
    };

  const backFromCredits =
    backFromSettings;

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
          setDatasetVersion(null);
          setStep("setup");

          clearLastVisited(user.id);
          // "Delete the active project | replace /" -- the resource this
          // entry named is gone.
          navigate("/", { replace: true });
        }
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * PIN / UNPIN CONVERSATION
   * ---------------------------------------------------------
   *
   * These deliberately do NOT go through runAction/setError: the sidebar
   * shows a failed pin (notably the backend's "You can pin up to 3
   * projects..." rejection) right where the user acted, so they REJECT and
   * let the sidebar display the message. On success only pinned_at changes
   * locally -- never updated_at -- so an unpinned project falls back into
   * its normal date group.
   */

  const pinChat = async (c) => {
    const updated = await pinConversation(c.id);
    setConversations((list) => withPinnedAt(list, c.id, updated?.pinned_at));
  };

  const unpinChat = async (c) => {
    await unpinConversation(c.id);
    setConversations((list) => withPinnedAt(list, c.id, null));
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
    pinChat,
    unpinChat,
    saveSetup,
    file,
    validateDataset,
    applyGroupings,
    declareTypes,
    reverseScores,
    saveColumnCategoryOrder,
    clearColumnCategoryOrder,
    uploadChapter1,
    removeChapter1,
    activateDataset,
    build,
    confirmQualitativeColumns,
    overrideAnalysis,
    run,
    onQualitativeFinalized,
    goToChapter4,
    backToAnalysis,
    backToSetup,
    backFromReview,
    backFromAnalysis,
    settingsView,
    leaveSettings,
    openAccount,
    backFromAccount,
    openCredits,
    backFromCredits,
    download,
  };
}
