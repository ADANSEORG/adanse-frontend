/*
 * ---------------------------------------------------------
 * "FILL IN FROM MY CHAPTERS" (RESEARCH CONTEXT)
 * ---------------------------------------------------------
 *
 * The backend (POST /thesis/chapter-document/extract) returns, per field,
 * items copied word for word from the student's own Chapter 1-3 .docx, or
 * a plain reason why nothing was found. The student ticks what to keep;
 * only ticked items are added to the Research Context form, and nothing is
 * saved until they save the form as usual.
 *
 * Anything malformed in the response is treated as "not found": this never
 * shows an item that didn't come back as a verified, found string.
 */

import { normalizeForMatch } from "./chapter1Compare.js";

export const FILL_CONSENT_NOTICE =
  "Adanse sends only the parts of your chapters that state these items to its AI reading assistant, and doesn't store your file. Nothing is added until you choose.";

export const FILL_DAILY_LIMIT_MESSAGE =
  "You've reached today's limit for reading chapters. Try again tomorrow, or type your research context in yourself.";

export const LIST_FIELDS = [
  ["objectives", "Research objectives"],
  ["research_questions", "Research questions"],
  ["hypotheses", "Hypotheses"],
];

const NOT_FOUND_FALLBACK = "Adanse didn't find this in your chapters.";

function cleanItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

/*
 * The review list: [{ field, label, found, items: [{ key, text }], message }]
 * plus one entry for the planned sample size ({ value, quote } when found).
 */
export function fillReview(result) {
  const fields = result?.fields || {};

  const lists = LIST_FIELDS.map(([field, label]) => {
    const entry = fields[field] || {};
    const items = entry.status === "found" ? cleanItems(entry.items) : [];
    return {
      field,
      label,
      found: items.length > 0,
      items: items.map((text, index) => ({ key: `${field}:${index}`, text })),
      message: items.length ? "" : String(entry.message || NOT_FOUND_FALLBACK),
    };
  });

  const sample = fields.planned_sample_size || {};
  const value = sample.value;
  const sampleFound =
    sample.status === "found" &&
    Number.isInteger(value) &&
    value >= 1 &&
    typeof sample.quote === "string" &&
    sample.quote.trim() !== "";

  return [
    ...lists,
    {
      field: "planned_sample_size",
      label: "Planned sample size",
      found: sampleFound,
      items: sampleFound ? [{ key: "planned_sample_size", text: sample.quote.trim() }] : [],
      value: sampleFound ? value : null,
      message: sampleFound ? "" : String(sample.message || NOT_FOUND_FALLBACK),
    },
  ];
}

// Every found item starts ticked.
export function defaultTicks(review) {
  return new Set(review.flatMap((entry) => entry.items.map((item) => item.key)));
}

export function tickedCount(review, ticked) {
  return review.reduce(
    (count, entry) => count + entry.items.filter((item) => ticked.has(item.key)).length,
    0
  );
}

/*
 * The form after adding the ticked items. Lists keep what the student
 * already has and gain the ticked items that aren't already there (same
 * normalized comparison as the Chapter 1 panel). A ticked sample size
 * replaces the sample size box. Returns only the fields that change, and
 * how many items each gained.
 */
export function applyFill(current, review, ticked) {
  const changes = {};
  const added = {};

  for (const entry of review) {
    const picked = entry.items.filter((item) => ticked.has(item.key));
    if (!picked.length) continue;

    if (entry.field === "planned_sample_size") {
      changes.plannedSample = String(entry.value);
      added.planned_sample_size = 1;
      continue;
    }

    const existing = Array.isArray(current?.[entry.field]) ? current[entry.field] : [];
    const seen = new Set(existing.map(normalizeForMatch));
    const next = [...existing];
    for (const { text } of picked) {
      const key = normalizeForMatch(text);
      if (!seen.has(key)) {
        seen.add(key);
        next.push(text);
      }
    }
    if (next.length !== existing.length) {
      changes[entry.field] = next;
      added[entry.field] = next.length - existing.length;
    }
  }

  return { changes, added };
}
