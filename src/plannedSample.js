/*
 * ---------------------------------------------------------
 * PLANNED SAMPLE SIZE (RESEARCH CONTEXT)
 * ---------------------------------------------------------
 *
 * Optional. How many respondents the study planned to reach; the backend
 * uses it for the response-rate paragraph at the start of Chapter 4's
 * 4.2 Data Overview (backend app/services/response_rate.py). Stored on
 * the project as `sample_plan: { size, source }`.
 */

export const MAX_PLANNED_SAMPLE_SIZE = 1000000;

export function savedPlannedSample(project) {
  const size = project?.sample_plan?.size;
  return Number.isInteger(size) && size >= 1 ? size : null;
}

// What the researcher typed -> { value, error }. Blank is valid (no size).
export function parsePlannedSample(text) {
  const raw = String(text ?? "").trim().replace(/[,\s]/g, "");
  if (!raw) return { value: null, error: "" };
  if (!/^\d+$/.test(raw)) {
    return { value: null, error: "Enter a whole number, e.g. 200." };
  }
  const value = Number(raw);
  if (value < 1 || value > MAX_PLANNED_SAMPLE_SIZE) {
    return {
      value: null,
      error: `Enter a number between 1 and ${MAX_PLANNED_SAMPLE_SIZE.toLocaleString("en-US")}.`,
    };
  }
  return { value, error: "" };
}

/*
 * The field to add to the Research Context save, or {} when nothing changed.
 * Only a change is sent (null clears a saved size), so an ordinary save
 * never touches the sample_plan column.
 */
export function plannedSamplePayload(text, project) {
  const { value, error } = parsePlannedSample(text);
  if (error) return {};
  return value === savedPlannedSample(project) ? {} : { planned_sample_size: value };
}
