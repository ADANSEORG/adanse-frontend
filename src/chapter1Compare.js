/*
 * ---------------------------------------------------------
 * CHAPTER 1 OBJECTIVES — SIDE-BY-SIDE COMPARISON
 * ---------------------------------------------------------
 *
 * The researcher can upload their own Chapter 1-3 Word document; the
 * backend reads the objectives list from Chapter 1 (word for word, or
 * nothing at all -- see backend app/services/chapter1_objectives.py) and
 * saves it on the project as `chapter1_objectives`.
 *
 * This is informational only: both lists are shown next to each other
 * and nothing is changed in Research Context or Chapter 4. No verdicts --
 * the researcher decides what a difference means.
 */

export const CONSENT_NOTICE =
  "This document is used only to compare against your Research Context, and isn't stored. Only the objectives Adanse finds in it are saved.";

export const NOT_A_DOCX_MESSAGE =
  "Adanse can only read Word documents saved as .docx. If your chapters are in an older .doc file or a PDF, open them in Word (or Google Docs) and save or download them as a Word Document (.docx), then upload that file.";

export function isDocxFile(file) {
  return /\.docx$/i.test(String(file?.name || ""));
}

function cleanList(values) {
  return (Array.isArray(values) ? values : [])
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
}

/*
 * Character normalization applied to both sides before comparing -- not
 * fuzzy matching: curly quotes become straight ones, en/em dashes become
 * "-", runs of whitespace become one space, and the ends are trimmed.
 * Case, punctuation and every word are left exactly as written. Used
 * only for the comparison; the text shown is never changed.
 */
export function normalizeForMatch(text) {
  return String(text ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * For each item of `list`, whether an item of `other` is identical once
 * both are normalized (normalizeForMatch). Still exact string equality:
 * no case folding, no similarity scoring.
 */
export function exactMatches(list, other) {
  const others = new Set(cleanList(other).map(normalizeForMatch));
  return cleanList(list).map((item) => others.has(normalizeForMatch(item)));
}

/*
 * What the panel shows for a project:
 *   { state: "none" }                       -- no document uploaded
 *   { state: "found", heading, fromDocument, entered,
 *     documentMatches, enteredMatches }  -- per-line exact-match flags
 *                                           (see exactMatches)
 *   { state: "not_found", message, entered } -- nothing from the document
 * Anything malformed is treated as "not_found" with no objectives, never
 * as a partial list.
 */
export function comparisonView(project) {
  const saved = project?.chapter1_objectives;
  const entered = cleanList(project?.objectives);

  if (!saved || typeof saved !== "object") {
    return { state: "none" };
  }

  const fromDocument = cleanList(saved.objectives);

  if (saved.status === "found" && fromDocument.length > 0) {
    return {
      state: "found",
      heading: String(saved.heading || "").trim(),
      fromDocument,
      entered,
      documentMatches: exactMatches(fromDocument, entered),
      enteredMatches: exactMatches(entered, fromDocument),
    };
  }

  return {
    state: "not_found",
    message: String(saved.message || "").trim(),
    entered,
  };
}
