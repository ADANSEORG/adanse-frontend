/*
 * ---------------------------------------------------------
 * STUDY TYPE (RESEARCH DETAILS)
 * ---------------------------------------------------------
 *
 * The researcher's own answer to "What kind of study is this?". Saved as
 * thesis_projects.study_type; null means not chosen yet, and the form then
 * looks exactly as it did before study types existed.
 *
 * Hiding a field never clears it: a qualitative project's saved hypotheses
 * stay in the form state and are sent back unchanged on save, so switching
 * a study to qualitative and back loses nothing.
 */

export const QUANTITATIVE = "quantitative";
export const QUALITATIVE = "qualitative";
export const MIXED = "mixed";

export const STUDY_TYPE_OPTIONS = [
  {
    value: QUANTITATIVE,
    label: "Quantitative",
    description: "Surveys or questionnaires with numbers and rating scales, analysed with statistical tests.",
  },
  {
    value: QUALITATIVE,
    label: "Qualitative",
    description: "Interviews, focus groups or open-ended responses, analysed by theme.",
  },
  {
    value: MIXED,
    label: "Mixed methods",
    description: "Both: statistical tests and thematic analysis in one study.",
  },
];

export function normalizeStudyType(value) {
  return STUDY_TYPE_OPTIONS.some((option) => option.value === value) ? value : null;
}

/*
 * What the Research details form shows for a study type. `null` (not
 * chosen) gives today's quantitative-leaning form unchanged.
 */
export function setupFieldsFor(studyType) {
  const type = normalizeStudyType(studyType);

  if (type === QUALITATIVE) {
    return {
      showHypotheses: false,
      hypothesesLabel: "Hypotheses",
      hypothesesHelp: "",
      objectivePlaceholder: "e.g. To explore students' experiences of…",
      questionPlaceholder: "e.g. How do students describe their experiences of…?",
      sampleLabel: "Number of participants",
      sampleHelp:
        "How many participants your study planned to include (for example, interviewees), as stated in your Chapter 3. Adanse mentions it in Chapter 4; no response rate is calculated for a qualitative study.",
      samplePlaceholder: "e.g. 12",
      methodPlaceholder: "e.g. Semi-structured interviews with purposively selected teachers…",
    };
  }

  if (type === MIXED) {
    return {
      showHypotheses: true,
      hypothesesLabel: "Hypotheses (quantitative strand)",
      hypothesesHelp: "Optional. Only for the statistical part of your study. Adanse preserves your wording when testing them.",
      objectivePlaceholder: "e.g. To examine the extent of… and explore experiences of…",
      questionPlaceholder: "e.g. What is the extent of…? How do participants describe…?",
      sampleLabel: "Planned sample size",
      sampleHelp:
        "How many survey respondents your study planned to reach, as stated in your Chapter 3. Adanse uses it to report your response rate in Chapter 4.",
      samplePlaceholder: "e.g. 200",
      methodPlaceholder: "e.g. Survey of 200 students followed by interviews with 10…",
    };
  }

  return {
    showHypotheses: true,
    hypothesesLabel: "Hypotheses",
    hypothesesHelp: "Optional. Adanse preserves your wording when testing them.",
    objectivePlaceholder: "e.g. To examine the extent of AI tool usage…",
    questionPlaceholder: "e.g. What is the extent of AI tool usage?",
    sampleLabel: "Planned sample size",
    sampleHelp:
      "How many respondents your study planned to reach, as stated in your Chapter 3. Adanse uses it to report your response rate in Chapter 4.",
    samplePlaceholder: "e.g. 200",
    methodPlaceholder: "e.g. Cross-sectional survey of undergraduate students…",
  };
}

/*
 * "n of N sections filled": only the sections that apply to this study
 * type count, so a qualitative study can reach N of N without hypotheses.
 */
export function filledSections({ studyType, title, objectives, questions, hypotheses, plannedSample }) {
  const fields = setupFieldsFor(studyType);
  const sections = [
    Boolean(normalizeStudyType(studyType)),
    Boolean(String(title || "").trim()),
    (objectives || []).length > 0,
    (questions || []).length > 0,
    ...(fields.showHypotheses ? [(hypotheses || []).length > 0] : []),
    Boolean(String(plannedSample || "").trim()),
  ];
  return { filled: sections.filter(Boolean).length, total: sections.length };
}

/*
 * Chapters 1-3 import, filtered for the study type: a qualitative study
 * gets no hypotheses row, and its sample-size row reads as participants.
 */
export function reviewForStudyType(review, studyType) {
  if (!Array.isArray(review)) return review;
  if (normalizeStudyType(studyType) !== QUALITATIVE) return review;
  return review
    .filter((entry) => entry.field !== "hypotheses")
    .map((entry) =>
      entry.field === "planned_sample_size"
        ? { ...entry, label: "Number of participants" }
        : entry
    );
}
