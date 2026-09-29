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
 * Both lists are shown next to each other with no verdicts -- the
 * researcher decides what a difference means. The only change it can make
 * is one the researcher asks for: "Use this wording" on a document line
 * copies that wording into Research Context's objectives
 * (objectivesWithDocumentWording). Chapter 4 is never touched, and nothing
 * ever flows the other way: the document is read-only and never stored.
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
  return matchPositions(list, other).map((position) => position !== null);
}

/*
 * For each item of `list`, the 1-based position in `other` of the item it
 * matches (the same position as `other`'s own numbered list), or null if
 * none does. Same comparison as exactMatches. If the same wording appears
 * more than once in `other`, the first one is named.
 */
export function matchPositions(list, other) {
  const positions = new Map();
  cleanList(other).forEach((item, index) => {
    const key = normalizeForMatch(item);
    if (!positions.has(key)) positions.set(key, index + 1);
  });
  return cleanList(list).map(
    (item) => positions.get(normalizeForMatch(item)) ?? null
  );
}

/*
 * The Research Context objectives after "Use this wording" on the document
 * objective at 1-based `position`: the entered objective at the same
 * position takes the document's wording, or, if the entered list is
 * shorter, the wording is added at the end. Positions are those shown in
 * the panel's numbered "You entered" list (blank entries aren't shown, so
 * they're dropped here too).
 */
export function objectivesWithDocumentWording(entered, position, wording) {
  const list = cleanList(entered);
  const text = String(wording ?? "").trim();
  if (!text) return list;
  if (Number.isInteger(position) && position >= 1 && position <= list.length) {
    list[position - 1] = text;
  } else {
    list.push(text);
  }
  return list;
}

/*
 * The panel's display rows, for a "found" view. Display order only --
 * nothing here reorders or renumbers the objectives themselves.
 *
 *   - One row per document objective, in document order.
 *   - A matched entered objective sits in the row of the document objective
 *     it matches (the first one, if that wording appears twice in the
 *     document); a document row with no match has `entered: null`.
 *   - Every entered objective not placed that way (unmatched ones, and a
 *     second copy of wording already placed) follows in its own row, in its
 *     original relative order, with `document: null`.
 *
 * Each cell keeps its real 1-based `number` in its own list (for the
 * entered side, its position in Research Context as the panel lists it)
 * and its `matchPosition` on the other side (matchPositions).
 */
export function comparisonRows(view) {
  const fromDocument = view?.fromDocument || [];
  const entered = view?.entered || [];
  const documentPositions = view?.documentMatchPositions || [];
  const enteredPositions = view?.enteredMatchPositions || [];

  const enteredCell = (index) => ({
    text: entered[index],
    number: index + 1,
    matchPosition: enteredPositions[index] ?? null,
  });

  const placed = new Set();
  const rows = fromDocument.map((text, index) => {
    const matchPosition = documentPositions[index] ?? null;
    const enteredIndex = matchPosition === null ? null : matchPosition - 1;
    const usable = enteredIndex !== null && !placed.has(enteredIndex) && enteredIndex < entered.length;
    if (usable) placed.add(enteredIndex);
    return {
      document: { text, number: index + 1, matchPosition },
      entered: usable ? enteredCell(enteredIndex) : null,
    };
  });

  entered.forEach((_, index) => {
    if (!placed.has(index)) rows.push({ document: null, entered: enteredCell(index) });
  });

  return rows;
}

/*
 * The tag under one line. `position` is from matchPositions; `otherSide`
 * names the list it points into: "entered" (for a document line) or
 * "document" (for an entered line).
 */
export function matchLabel(position, otherSide) {
  if (position === null || position === undefined) return "No exact match found";
  return otherSide === "document"
    ? `Matches item ${position} in your document`
    : `Matches item ${position} in what you entered`;
}

/*
 * What the panel shows for a project:
 *   { state: "none" }                       -- no document uploaded
 *   { state: "found", heading, fromDocument, entered,
 *     documentMatches, enteredMatches,   -- per-line exact-match flags
 *     documentMatchPositions,            -- and the 1-based position of the
 *     enteredMatchPositions }               matched item on the other side
 *                                           (see matchPositions)
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
      documentMatchPositions: matchPositions(fromDocument, entered),
      enteredMatchPositions: matchPositions(entered, fromDocument),
    };
  }

  return {
    state: "not_found",
    message: String(saved.message || "").trim(),
    entered,
  };
}
