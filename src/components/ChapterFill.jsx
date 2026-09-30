import { useRef, useState } from "react";

import { extractChapterDocument } from "../api.js";
import { friendly } from "../errors.js";
import { NOT_A_DOCX_MESSAGE, isDocxFile } from "../chapter1Compare.js";
import {
  FILL_CONSENT_NOTICE,
  FILL_DAILY_LIMIT_MESSAGE,
  applyFill,
  defaultTicks,
  fillReview,
  tickedCount,
  titleWouldReplace,
} from "../chapterFill.js";

/*
 * Optional, on Research Context: read objectives, research questions,
 * hypotheses and the planned sample size from the student's own Chapter 1-3
 * .docx, and add only what they tick to the form. Nothing is saved until
 * they save the form. See chapterFill.js.
 */
export default function ChapterFill({ current, onApply, disabled = false }) {
  const inputRef = useRef(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(null);
  const [ticked, setTicked] = useState(() => new Set());
  const [addedNote, setAddedNote] = useState("");

  const count = review ? tickedCount(review, ticked) : 0;
  const nothingFound = review && review.every((entry) => !entry.found);

  async function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
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
      <div className="current-dataset-label">Optional · Fill in from my chapters</div>

      <p className="chapter1-compare-lead">
        Upload your Chapter 1–3 Word document (.docx) and Adanse will find
        your objectives, research questions, hypotheses and planned sample
        size. You choose what to add.
      </p>

      <p className="chapter1-compare-consent">{FILL_CONSENT_NOTICE}</p>

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
            <p className="chapter1-compare-empty">
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
                <p className="chapter1-compare-note">Ticking this replaces the title you've typed.</p>
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
                <p className="chapter1-compare-note">{entry.message}</p>
              )}
            </fieldset>
          ))}

          <p className="chapter1-compare-note">
            Every item is copied word for word from your document. Untick
            anything you don't want.
          </p>
        </div>
      )}

      {addedNote && <p className="chapter-fill-added" role="status">{addedNote}</p>}
      {error && <div className="chapter1-compare-error" role="alert">{error}</div>}

      <div className="chapter1-compare-actions">
        <button
          className="btn btn-secondary"
          type="button"
          disabled={locked}
          onClick={() => inputRef.current?.click()}
        >
          {reading
            ? "Reading your chapters…"
            : review
            ? "Use a different document"
            : "Fill in from my chapters (.docx)"}
        </button>

        {review && !nothingFound && (
          <button className="btn btn-primary" type="button" disabled={locked || count === 0} onClick={add}>
            {count ? `Add ${count} ticked item${count === 1 ? "" : "s"}` : "Tick items to add"}
          </button>
        )}

        {review && (
          <button className="btn btn-secondary" type="button" disabled={locked} onClick={() => setReview(null)}>
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}
