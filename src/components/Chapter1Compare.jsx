import { useRef, useState } from "react";

import { friendly } from "../errors.js";
import {
  CONSENT_NOTICE,
  NOT_A_DOCX_MESSAGE,
  comparisonView,
  isDocxFile,
} from "../chapter1Compare.js";

/*
 * Optional: the researcher's own Chapter 1-3 (.docx) objectives next to the
 * objectives saved in Research Context. Informational only -- nothing here
 * changes Research Context or Chapter 4. See chapter1Compare.js.
 */
export default function Chapter1Compare({ project, onUpload, onRemove }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!project) return null;

  const view = comparisonView(project);

  async function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isDocxFile(file)) {
      setError(NOT_A_DOCX_MESSAGE);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onUpload(file);
    } catch (e) {
      setError(e?.status === 400 || e?.status === 413 ? e.message : friendly(e, "Adanse couldn't read that document. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await onRemove();
    } catch (e) {
      setError(friendly(e, "Couldn't remove the comparison. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="chapter1-compare">
      <div className="current-dataset-label">Optional · Compare with your Chapter 1</div>

      <p className="chapter1-compare-lead">
        Upload your Chapter 1–3 Word document (.docx) to see the objectives it
        states next to the ones you entered in Research Context. Nothing is
        changed. It's there for you to compare.
      </p>

      <p className="chapter1-compare-consent">{CONSENT_NOTICE}</p>

      <input
        ref={inputRef}
        className="current-dataset-file-input"
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={choose}
        disabled={busy}
      />

      {view.state === "found" && (
        <div className="chapter1-compare-grid">
          <div className="chapter1-compare-col">
            <h3>Your document says</h3>
            {view.heading && (
              <div className="chapter1-compare-source">Under “{view.heading}”</div>
            )}
            <ol>
              {view.fromDocument.map((objective, i) => (
                <li key={i}>
                  <q>{objective}</q>
                </li>
              ))}
            </ol>
            <div className="chapter1-compare-note">
              Quoted word for word from your document, in the order they appear.
            </div>
          </div>

          <div className="chapter1-compare-col">
            <h3>You entered</h3>
            {view.entered.length > 0 ? (
              <ol>
                {view.entered.map((objective, i) => (
                  <li key={i}>{objective}</li>
                ))}
              </ol>
            ) : (
              <p className="chapter1-compare-note">No objectives saved in Research Context yet.</p>
            )}
          </div>
        </div>
      )}

      {view.state === "not_found" && (
        <div className="chapter1-compare-empty">
          <strong>No objectives shown from your document.</strong>{" "}
          {view.message}{" "}
          Adanse only shows a list it can match word for word to your
          document, so nothing is shown rather than a guess.
        </div>
      )}

      {error && <div className="chapter1-compare-error" role="alert">{error}</div>}

      <div className="chapter1-compare-actions">
        <button
          className="btn btn-secondary"
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy
            ? "Reading…"
            : view.state === "none"
            ? "Upload Chapter 1–3 (.docx)"
            : "Upload a different document"}
        </button>

        {view.state !== "none" && (
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={remove}>
            Remove
          </button>
        )}
      </div>
    </section>
  );
}
