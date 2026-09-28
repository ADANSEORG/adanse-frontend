/*
 * Pure logic for the dataset-review "personal data" section: which columns the
 * backend excluded as personal data (email, name, phone, ID...), what to say
 * about each, and what to send when the researcher includes one anyway.
 * Kept out of the component so it is testable under plain node:test.
 *
 * The backend marks a profile entry `personal_data` ({kind, label, reason}) when
 * it excluded the column by default, and `personal_data_overridden` (the kind)
 * when the researcher declared a type for a column that would have been flagged.
 */

const DECLARABLE_TYPES = new Set(["numeric", "categorical", "open_text", "datetime"]);

// Versions the researcher can still branch a new version from. Failed and
// superseded versions are dead ends.
const CHANGEABLE_STATUSES = new Set(["cleaned", "validated"]);

// Every flagged column in the profile, in profile order. `excluded` is true
// while it is left out of analysis and reports, false once the researcher
// chose to include it.
export function personalDataFlags(profile) {
  if (!Array.isArray(profile)) return [];

  const flags = [];
  for (const entry of profile) {
    if (entry?.personal_data) {
      flags.push({
        column: entry.name,
        kind: entry.personal_data.kind,
        label: entry.personal_data.label || entry.personal_data.kind,
        reason: entry.personal_data.reason || "",
        excluded: true,
        byResearcher: Boolean(entry.personal_data.by_researcher),
        semanticType: entry.semantic_type,
      });
    } else if (entry?.personal_data_overridden) {
      flags.push({
        column: entry.name,
        kind: entry.personal_data_overridden,
        label: entry.personal_data_overridden,
        reason: "Flagged as possible personal data; you chose to include it.",
        excluded: false,
        byResearcher: true,
        semanticType: entry.semantic_type,
      });
    }
  }
  return flags;
}

export function excludedFlags(flags) {
  return (flags || []).filter((flag) => flag.excluded);
}

export function personalDataHeadline(flags) {
  const excluded = excludedFlags(flags).length;
  const included = (flags || []).length - excluded;

  const parts = [];
  if (excluded) {
    parts.push(
      `${excluded} column${excluded === 1 ? " was" : "s were"} left out as personal data`
    );
  }
  if (included) {
    parts.push(`${included} included by you`);
  }
  return parts.join(" · ");
}

// The type to declare when including a column: what its values looked like,
// falling back to categorical (an empty column cannot be declared at all).
export function declaredTypeForInclude(flag) {
  return DECLARABLE_TYPES.has(flag?.semanticType) ? flag.semanticType : "categorical";
}

// The request body for "include anyway".
export function includeRequest(flag) {
  return { [flag.column]: declaredTypeForInclude(flag) };
}

// Including creates a new version, so it is only offered where that makes sense.
export function canInclude(flag, version, loading = false) {
  return Boolean(
    flag?.excluded &&
      !loading &&
      version &&
      version.kind !== "original" &&
      CHANGEABLE_STATUSES.has(version.status || "cleaned")
  );
}

// Said by both confirmations when the current version is active: replacing it
// discards the researcher's analysis, and running it again is charged. The cost
// is the backend's configured one (GET /credits' costs.analysis, passed in);
// if it has not loaded, the sentence just leaves the cost out rather than
// guess a number.
export function resetSentence(rerunCost) {
  const reset = "Your current analysis plan and results will be reset";
  if (!Number.isFinite(rerunCost) || rerunCost < 0) return `${reset}.`;
  if (rerunCost === 0) return `${reset}, and running the analysis again is free.`;
  const credits = rerunCost === 1 ? "1 credit" : `${rerunCost} credits`;
  return `${reset}, and running the analysis again costs ${credits}.`;
}

// What the confirmation says before personal data is let into reports.
export function includeConfirmation(flag, versionIsActive = false, rerunCost = null) {
  const lines = [
    `Include “${flag.column}” in your analysis and reports? It looks like ${flag.label}, ` +
      "and it may then appear in Chapter 4 tables. Only do this if it is not personal data.",
    "This creates a new dataset version that you will need to validate and activate.",
  ];
  if (versionIsActive) {
    lines.push(resetSentence(rerunCost));
  }
  return lines.join(" ");
}

// "Leave out again": the reverse of including. Declares the column an
// identifier, which the backend treats as excluded from analysis and reports
// (and keeps listing as personal data, so it can be included again).
export function leaveOutRequest(flag) {
  return { [flag.column]: "identifier" };
}

// Only a column the researcher has included can be left out again.
export function canLeaveOut(flag, version, loading = false) {
  return Boolean(
    flag &&
      flag.excluded === false &&
      !loading &&
      version &&
      version.kind !== "original" &&
      CHANGEABLE_STATUSES.has(version.status || "cleaned")
  );
}

export function leaveOutConfirmation(flag, versionIsActive = false, rerunCost = null) {
  const lines = [
    `Leave \u201c${flag.column}\u201d out of your analysis and reports again? ` +
      "It will be excluded like other personal data.",
    "This creates a new dataset version that you will need to validate and activate.",
  ];
  if (versionIsActive) {
    lines.push(resetSentence(rerunCost));
  }
  return lines.join(" ");
}

// One action per flag, so the row and its confirmation always agree on what a
// click will do: "include" for a column that is left out, "leave" for one that
// was included.
export function flagAction(flag) {
  return flag?.excluded ? "include" : "leave";
}

export function actionRequest(flag) {
  return flagAction(flag) === "include" ? includeRequest(flag) : leaveOutRequest(flag);
}

export function actionConfirmation(flag, versionIsActive = false, rerunCost = null) {
  return flagAction(flag) === "include"
    ? includeConfirmation(flag, versionIsActive, rerunCost)
    : leaveOutConfirmation(flag, versionIsActive, rerunCost);
}

export function actionAvailable(flag, version, loading = false) {
  return flagAction(flag) === "include"
    ? canInclude(flag, version, loading)
    : canLeaveOut(flag, version, loading);
}
