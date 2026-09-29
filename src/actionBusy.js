/*
 * ---------------------------------------------------------
 * PER-ACTION BUSY STATE
 * ---------------------------------------------------------
 *
 * Each independent action (build the plan, save the qualitative
 * selection, save a variable override, run analysis, Continue from
 * the Dataset step) has its own busy flag in useThesisWorkflow's
 * `busyActions` -- { [action]: boolean }. A button shows its loading
 * label only for its OWN action; while any action is running, every
 * action button is disabled (normal label, greyed) so two requests
 * can't overlap -- e.g. running analysis on a selection that is still
 * being saved. The screen-wide `loading` (opening a project, uploads,
 * validate/activate, download) disables them too.
 */

export function anyBusy(busyActions) {
  return Object.values(busyActions || {}).some(Boolean);
}

export function actionButton(busyActions, action, screenLoading = false) {
  return {
    loading: Boolean(busyActions?.[action]),
    disabled: Boolean(screenLoading) || anyBusy(busyActions),
  };
}

// The qualitative selection's button text on the Analysis step.
export function selectionButtonLabel(state, confirmed) {
  if (state?.loading) return "Saving…";
  return confirmed ? "Update selection" : "Confirm qualitative data →";
}

// The plan-building button text on the Analysis step.
export function buildButtonLabel(state) {
  return state?.loading ? "Understanding dataset…" : "Understand dataset →";
}
