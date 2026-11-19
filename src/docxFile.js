/*
 * Helpers for the student's own Chapter 1-3 Word document, read by
 * "Fill in from my chapters" on Research Context (ChapterFill).
 */

export const NOT_A_DOCX_MESSAGE =
  "Adanse can only read Word documents saved as .docx. If your chapters are in an older .doc file or a PDF, open them in Word (or Google Docs) and save or download them as a Word Document (.docx), then upload that file.";

export function isDocxFile(file) {
  return /\.docx$/i.test(String(file?.name || ""));
}

/*
 * Character normalization applied before comparing two pieces of wording --
 * not fuzzy matching: curly quotes become straight ones, en/em dashes become
 * "-", runs of whitespace become one space, and the ends are trimmed. Case,
 * punctuation and every word are left exactly as written. Used only for
 * comparing; the text shown or saved is never changed.
 */
export function normalizeForMatch(text) {
  return String(text ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
