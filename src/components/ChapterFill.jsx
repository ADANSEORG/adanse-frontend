import { useRef, useState } from "react";
import { FileUp } from "lucide-react";

import { extractChapterDocument } from "../api.js";
import { friendly } from "../errors.js";
import { NOT_A_DOCX_MESSAGE, isDocxFile } from "../docxFile.js";
import {
  FILL_CONSENT_NOTICE,
  FILL_DAILY_LIMIT_MESSAGE,
  applyFill,
  defaultTicks,
  fillReview,
  tickedCount,
  titleWouldReplace,
} from "../chapterFill.js";
import { reviewForStudyType } from "../studyType.js";

/*
 * Optional, on Research Context: read objectives, research questions,
 * hypotheses and the planned sample size from the student's own Chapter 1-3
 * .docx, and add only what they tick to the form. Nothing is saved until
 * they save the form. See chapterFill.js.
 */
export default function ChapterFill({ current, onApply, studyType = null, disabled = false }) {
  const inputRef = useRef(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [fullReview, setReview] = useState(null);
  // Filtered at render, not at read time, so changing the study type after
  // reading the file updates the list (a qualitative study gets no
  // hypotheses row; its sample size reads as participants).
  const review = reviewForStudyType(fullReview, studyType);
  const [ticked, setTicked] = useState(() => new Set());
  const [addedNote, setAddedNote] = useState("");
  const [dragging, setDragging] = useState(false);

  const count = review ? tickedCount(review, ticked) : 0;
  const nothingFound = review && review.every((entry) => !entry.found);

  async function readFile(file) {
    if (!file || reading || disabled) return;

    if (!isDocxFile(file)) {
      setError(NOT_A_DOCX_MESSAGE);
      return;
    }

    setReading(true);
    setError("");
    setAddedNote("");

    try {
      const next = fillReview(await extractChapterDocument(file));
      setReview(next);
      setTicked(defaultTicks(next));
    } catch (e) {
      setReview(null);
      setError(
        e?.status === 429
          ? FILL_DAILY_LIMIT_MESSAGE
          : e?.status === 400 || e?.status === 413
          ? e.message
          : friendly(e, "Adanse couldn't read your chapters. Please try again.")
      );
    } finally {
      setReading(false);
    }
  }

  function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    readFile(file);
  }

  function drop(event) {
    event.preventDefault();
    setDragging(false);

    if (locked) return;

    readFile(event.dataTransfer.files?.[0]);
  }

  function toggle(key) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function add() {
    const { changes, added } = applyFill(current, review, ticked);
    onApply(changes);
    const total = Object.values(added).reduce((a, b) => a + b, 0);
    setAddedNote(
      total
        ? `Added ${total} item${total === 1 ? "" : "s"} below. Check them, then save your research context.`
        : "Those items are already in your research context."
    );
    setReview(null);
  }

  const locked = reading || disabled;

  return (
    <section className="chapter-fill">
      <p className="field-label">
        Import from Chapters 1–3
        <span className="field-optional">
          Optional
        </span>
      </p>

      <div
        className={`import-row${
          dragging ? " dragging" : ""
        }${locked ? " disabled" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();

          if (!locked) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
      >
        <FileUp
          size={18}
          strokeWidth={1.8}
          className="import-row-icon"
          aria-hidden="true"
        />

        <div className="import-row-copy">
          <strong>
            Upload Chapters 1–3 (.docx)
          </strong>

          <span>
            Adanse can fill these fields
            automatically. You choose what to add.
          </span>
        </div>

        <button
          className="btn btn-secondary"
          type="button"
          disabled={locked}
          onClick={() => inputRef.current?.click()}
        >
          {reading
            ? "Reading…"
            : review
            ? "Use a different file"
            : "Choose file"}
        </button>
      </div>

      <p className="chapter-fill-consent">
        {FILL_CONSENT_NOTICE}
      </p>

      <input
        ref={inputRef}
        className="current-dataset-file-input"
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={choose}
        disabled={locked}
      />

      {review && (
        <div className="chapter-fill-review">
          {nothingFound && (
            <p className="chapter-fill-empty">
              <strong>Adanse didn't find anything it could copy word for word from your chapters.</strong>{" "}
              You can type your research context in below.
            </p>
          )}

          {review.map((entry) => (
            <fieldset className="chapter-fill-field" key={entry.field}>
              <legend>
                {entry.label}
                {entry.found && (
                  <span className="chapter-fill-count">
                    {entry.field === "planned_sample_size"
                      ? ` · ${entry.value.toLocaleString("en-US")}`
                      : ` · ${entry.items.length} found`}
                  </span>
                )}
              </legend>

              {entry.field === "title" && titleWouldReplace(current, review) && (
                <p className="chapter-fill-note">Ticking this replaces the title you've typed.</p>
              )}

              {entry.found ? (
                entry.items.map((item) => (
                  <label className="chapter-fill-item" key={item.key}>
                    <input
                      type="checkbox"
                      checked={ticked.has(item.key)}
                      onChange={() => toggle(item.key)}
                    />
                    <q>{item.text}</q>
                  </label>
                ))
              ) : (
                <p className="chapter-fill-note">{entry.message}</p>
              )}
            </fieldset>
          ))}

          <p className="chapter-fill-note">
            Every item is copied word for word from your document. Untick
            anything you don't want.
          </p>
        </div>
      )}

      {addedNote && <p className="chapter-fill-added" role="status">{addedNote}</p>}
      {error && <div className="chapter-fill-error" role="alert">{error}</div>}

      {review && (
        <div className="chapter-fill-actions">
          {!nothingFound && (
            <button
              className="btn btn-primary"
              type="button"
              disabled={locked || count === 0}
              onClick={add}
            >
              {count
                ? `Add selected (${count})`
                : "Tick items to add"}
            </button>
          )}

          <button
            className="btn btn-secondary"
            type="button"
            disabled={locked}
            onClick={() => setReview(null)}
          >
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}
