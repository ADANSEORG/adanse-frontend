/*
 * ---------------------------------------------------------
 * INTERVIEW DATA ON THE DATA STEP
 * ---------------------------------------------------------
 *
 * Thematic analysis already runs on open-ended columns in a spreadsheet,
 * but Word/text transcripts can't be uploaded yet. The Data step says how
 * to put interview data in a spreadsheet, and only when someone actually
 * drops a transcript does it offer the "tell me when" waitlist -- instead
 * of sending the file to the backend just to be refused.
 */

export const INTERVIEW_GUIDANCE_TITLE = "Interview data?";

export const INTERVIEW_GUIDANCE_STEPS = [
  "Put it in a spreadsheet: one row per participant, one column per question.",
  "Keep each answer under about 1,500 words.",
  "Replace names with P1, P2, P3…",
];

const TRANSCRIPT_EXTENSIONS = {
  docx: "docx",
  doc: "doc",
  txt: "txt",
};

/* "docx" / "doc" / "txt" for a transcript-like file, otherwise null. */
export function transcriptFileType(file) {
  const name = String(file?.name || "").toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot < 0) return null;
  return TRANSCRIPT_EXTENSIONS[name.slice(dot + 1)] || null;
}

export function transcriptNotice(fileType) {
  const kind = fileType === "txt" ? "Text files" : "Word documents";
  return `${kind} can't be uploaded yet. Adanse analyses interview data from a spreadsheet for now (see below), and transcript upload is coming soon.`;
}
