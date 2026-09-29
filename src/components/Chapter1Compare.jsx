import { useRef, useState } from "react";

import { friendly } from "../errors.js";
import {
  CONSENT_NOTICE,
  NOT_A_DOCX_MESSAGE,
  comparisonView,
  isDocxFile,
  matchLabel,
} from "../chapter1Compare.js";

/*
 * Optional: the researcher's own Chapter 1-3 (.docx) objectives next to the
 * objectives saved in Research Context. The only change it makes is one the
 * researcher clicks for: "Use this wording" on a document line. Chapter 4 is
 * never touched. See chapter1Compare.js.
 */
// One objective, marked by whether the same wording (normalizeForMatch, then
// exact equality) is in the other list, and if so which numbered item it is.
// A text label goes with the colour so the cue doesn't rely on colour alone.
function MatchLine({ position, otherSide, action = null, children }) {
  const matched = position !== null && position !== undefined;
  return (
    <li className={matched ? "chapter1-line-matched" : "chapter1-line-unmatched"}>
      {children}
      <span className="chapter1-line-tag">{matchLabel(position, otherSide)}</span>
      {!matched && action}
    </li>
  );
}

export default function Chapter1Compare({ project, onUpload, onRemove, onUseWording, disabled = false }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!project) return null;

  const view = comparisonView(project);
  const locked = busy || disabled;

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

  // Document side only: copy this document objective's wording into
  // Research Context (same position, or added at the end). The panel
  // re-checks matches from the saved project straight away.
  async function useWording(position, wording) {
    setBusy(true);
    setError("");
    try {
      await onUseWording(position, wording);
    } catch (e) {
      setError(friendly(e, "Couldn't update your Research Context objectives. Please try again."));
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
        states next to the ones you entered in Research Context. Nothing
        changes unless you choose “Use this wording” on one of your
        document's objectives.
      </p>

      <p className="chapter1-compare-consent">{CONSENT_NOTICE}</p>

      <input
        ref={inputRef}
        className="current-dataset-file-input"
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={choose}
        disabled={locked}
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
                <MatchLine
                  key={i}
                  position={view.documentMatchPositions[i]}
                  otherSide="entered"
                  action={
                    onUseWording && (
                      <button
                        className="chapter1-use-wording"
                        type="button"
                        disabled={locked}
                        onClick={() => useWording(i + 1, objective)}
                      >
                        Use this wording →
                      </button>
                    )
                  }
                >
                  <q>{objective}</q>
                </MatchLine>
              ))}
            </ol>
            <div className="chapter1-compare-note">
              Quoted word for word from your document, in the order they appear.
              Each line is marked by whether the exact same wording appears in
              the other list. “Use this wording” puts a line's wording into
              your Research Context objectives: it replaces the objective at the
              same number, or is added at the end if you have fewer.
            </div>
          </div>

          <div className="chapter1-compare-col">
            <h3>You entered</h3>
            {view.entered.length > 0 ? (
              <ol>
                {view.entered.map((objective, i) => (
                  <MatchLine key={i} position={view.enteredMatchPositions[i]} otherSide="document">
                    {objective}
                  </MatchLine>
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
          disabled={locked}
          onClick={() => inputRef.current?.click()}
        >
          {busy
            ? "Reading…"
            : view.state === "none"
            ? "Upload Chapter 1–3 (.docx)"
            : "Upload a different document"}
        </button>

        {view.state !== "none" && (
          <button className="btn btn-secondary" type="button" disabled={locked} onClick={remove}>
            Remove
          </button>
        )}
      </div>
    </section>
  );
}
