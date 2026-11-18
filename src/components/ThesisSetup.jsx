import { useState } from "react";
import { X } from "lucide-react";

import {
  parsePlannedSample,
  plannedSamplePayload,
  savedPlannedSample,
} from "../plannedSample.js";
import ChapterFill from "./ChapterFill.jsx";

function ListEditor({
  label,
  help,
  value,
  onChange,
  placeholder,
  addLabel,
  itemLabel,
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const next = draft.trim();

    if (next) {
      onChange([...value, next]);
      setDraft("");
    }
  };

  return (
    <div className="field-block">
      <label>{label}</label>

      {help && <p className="field-help">{help}</p>}

      <div className="list-editor">
        {value.map((item, index) => (
          <div
            className="list-row"
            key={`${item}-${index}`}
          >
            <input
              className="text-input"
              value={item}
              aria-label={`${itemLabel} ${index + 1}`}
              onChange={(event) =>
                onChange(
                  value.map((current, position) =>
                    position === index
                      ? event.target.value
                      : current
                  )
                )
              }
            />

            <button
              type="button"
              className="list-row-remove"
              aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
              title="Remove"
              onClick={() =>
                onChange(
                  value.filter(
                    (_, position) =>
                      position !== index
                  )
                )
              }
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}

        <div className="list-add">
          <input
            value={draft}
            aria-label={`Add ${itemLabel.toLowerCase()}`}
            onChange={(event) =>
              setDraft(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
          />

          <button
            type="button"
            className="btn btn-secondary"
            onClick={add}
          >
            {addLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummarySection({
  title,
  items,
  numbered = true,
  emptyLabel = "Not added yet",
}) {
  return (
    <section className="study-summary-section">
      <h3>{title}</h3>

      {items.length === 0 ? (
        <p className="study-summary-empty">
          {emptyLabel}
        </p>
      ) : (
        <ol
          className={`study-summary-list ${
            numbered ? "" : "plain"
          }`}
        >
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>
              {item}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function ThesisSetup({
  initial,
  onSave,
  loading,
  onChapterFile,
}) {
  const [title, setTitle] = useState(
    initial?.title || ""
  );
  const [objectives, setObjectives] = useState(
    initial?.objectives || []
  );
  const [questions, setQuestions] = useState(
    initial?.research_questions || []
  );
  const [hypotheses, setHypotheses] = useState(
    initial?.hypotheses || []
  );
  const [methodology, setMethodology] = useState(
    initial?.methodology || ""
  );
  const [plannedSample, setPlannedSample] = useState(() => {
    const size = savedPlannedSample(initial);
    return size ? String(size) : "";
  });

  const plannedSampleError =
    parsePlannedSample(plannedSample).error;

  const applyChapterFill=c=>{if(c.title)setTitle(c.title);if(c.objectives)setObjectives(c.objectives);if(c.research_questions)setQuestions(c.research_questions);if(c.hypotheses)setHypotheses(c.hypotheses);if(c.plannedSample!==undefined)setPlannedSample(c.plannedSample);};

  const submit = (event) => {
    event.preventDefault();
    if(!title.trim()||plannedSampleError)return;

    onSave({
      title: title.trim(),
      objectives,
      research_questions: questions,
      hypotheses,
      methodology,
      ...plannedSamplePayload(plannedSample,initial),
    });
  };

  const filledSections = [
    title.trim(),
    objectives.length,
    questions.length,
    hypotheses.length,
    plannedSample.trim(),
  ].filter(Boolean).length;

  return (
    <section className="research-page">
      <header className="page-head">
        <h1 className="page-title">
          Research details
        </h1>

        <p className="page-help">
          Describe your study. Adanse uses this to
          choose suitable statistical tests.
        </p>
      </header>

      <div className="research-layout">
        <div className="research-form">
          <ChapterFill current={{title,objectives,research_questions:questions,hypotheses}} onApply={applyChapterFill} onFileRead={onChapterFile} disabled={loading} />

          <form onSubmit={submit}>
            <div className="field-block">
              <label htmlFor="study-title">
                Study title
              </label>

              <input
                id="study-title"
                className="text-input"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="e.g. The influence of artificial intelligence tools on academic performance among undergraduate students"
                required
              />

              <p className="field-help">
                Use the title on your proposal or
                title page.
              </p>
            </div>

            <ListEditor
              label="Objectives"
              itemLabel="Objective"
              addLabel="Add objective"
              help="Add each objective exactly as it appears in your proposal."
              value={objectives}
              onChange={setObjectives}
              placeholder="e.g. To examine the extent of AI tool usage…"
            />

            <ListEditor
              label="Research questions"
              itemLabel="Research question"
              addLabel="Add question"
              help="Optional, but useful when your questions differ from your objectives."
              value={questions}
              onChange={setQuestions}
              placeholder="e.g. What is the extent of AI tool usage?"
            />

            <ListEditor
              label="Hypotheses"
              itemLabel="Hypothesis"
              addLabel="Add hypothesis"
              help="Optional. Adanse preserves your wording when testing them."
              value={hypotheses}
              onChange={setHypotheses}
              placeholder="e.g. H1: AI usage is significantly associated with GPA."
            />

            <div className="field-block">
              <label htmlFor="methodology">
                Methodology / research design{" "}
                <span>optional</span>
              </label>

              <textarea
                id="methodology"
                className="text-input textarea"
                value={methodology}
                onChange={(event) =>
                  setMethodology(event.target.value)
                }
                placeholder="e.g. Cross-sectional survey of undergraduate students…"
                rows={4}
              />
            </div>

            <div className="field-block sample-size-block">
              <label htmlFor="planned-sample-size">Planned sample size <span>optional</span></label>

              <p className="field-help">
                How many respondents your study
                planned to reach, as stated in your
                Chapter 3. Adanse uses it to report
                your response rate in Chapter 4.
              </p>

              <input
                id="planned-sample-size"
                className="text-input sample-size-input"
                inputMode="numeric"
                value={plannedSample}
                onChange={(event) =>
                  setPlannedSample(
                    event.target.value
                  )
                }
                placeholder="e.g. 200"
                aria-invalid={Boolean(
                  plannedSampleError
                )}
                aria-describedby={
                  plannedSampleError
                    ? "planned-sample-size-error"
                    : undefined
                }
              />

              {plannedSampleError && (
                <p
                  className="field-error"
                  id="planned-sample-size-error"
                >
                  {plannedSampleError}
                </p>
              )}
            </div>

            <div className="form-footer">
              <span className="form-footer-note">
                Your changes are saved when you
                continue.
              </span>

              <button
                className="btn btn-primary"
                disabled={loading||!title.trim()||Boolean(plannedSampleError)}
              >
                {loading
                  ? "Saving…"
                  : "Save and continue"}
              </button>
            </div>
          </form>
        </div>

        <aside className="study-summary">
          <h2>Your study so far</h2>

          <SummarySection
            title="Study title"
            items={title.trim() ? [title.trim()] : []}
          />

          <SummarySection
            title="Objectives"
            items={objectives.filter(Boolean)}
          />

          <SummarySection
            title="Research questions"
            items={questions.filter(Boolean)}
          />

          <SummarySection
            title="Hypotheses"
            items={hypotheses.filter(Boolean)}
            numbered={false}
          />

          <SummarySection
            title="Planned sample size"
            items={
              plannedSample.trim()
                ? [plannedSample.trim()]
                : []
            }
            numbered={false}
          />

          <p className="study-summary-count">
            {filledSections} of 5 sections filled
          </p>
        </aside>
      </div>
    </section>
  );
}
