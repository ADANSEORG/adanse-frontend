import { useRef, useState } from "react";

import { friendly } from "../errors.js";
import { actionButton } from "../actionBusy.js";
import {
  CONSENT_NOTICE,
  NOT_A_DOCX_MESSAGE,
  comparisonView,
  comparisonRows,
  isDocxFile,
  matchLabel,
} from "../chapter1Compare.js";

/*
 * Optional: the researcher's own Chapter 1-3 (.docx) objectives next to the
 * objectives saved in Research Context. The only change it makes is one the
 * researcher clicks for: "Use this wording" on a document line. Chapter 4 is
 * never touched. See chapter1Compare.js.
 */
// One objective's cell, marked by whether the same wording (normalizeForMatch,
// then exact equality) is in the other list, and if so which numbered item it
// is. `number` is the objective's real position in its own list, shown as-is
// whatever row it is displayed in. A text label goes with the colour so the
// cue doesn't rely on colour alone.
// Shown above each cell on phones, where the column headers are hidden.
const SIDE_LABELS = { document: "Your document", entered: "You entered" };

function MatchCell({ cell, side, otherSide, action = null }) {
  if (!cell) {
    return (
      <td className="chapter1-cell-empty" data-label={SIDE_LABELS[side]}>
        <span aria-hidden="true">—</span>
        <span className="chapter1-sr-only">Nothing in this row</span>
      </td>
    );
  }
  const matched = cell.matchPosition !== null && cell.matchPosition !== undefined;
  return (
    <td
      className={matched ? "chapter1-line-matched" : "chapter1-line-unmatched"}
      data-label={SIDE_LABELS[side]}
    >
      <span className="chapter1-cell-number">{cell.number}.</span>{" "}
      {side === "document" ? <q>{cell.text}</q> : cell.text}
      <span className="chapter1-line-tag">{matchLabel(cell.matchPosition, otherSide)}</span>
      {!matched && action}
    </td>
  );
}

export default function Chapter1Compare({ project, onUpload, onRemove, onUseWording, disabled = false }) {
  const inputRef = useRef(null);
  // One busy flag per action (see actionBusy.js): "upload", "remove", or
  // "wording:<n>" for one document line. A button shows its loading label
  // only for its own action; while any runs, the others are disabled with
  // their normal label.
  const [pending, setPending] = useState({});
  const [error, setError] = useState("");

  if (!project) return null;

  const view = comparisonView(project);
  const uploadButton = actionButton(pending, "upload", disabled);
  const removeButton = actionButton(pending, "remove", disabled);
  const wordingButton = (number) => actionButton(pending, `wording:${number}`, disabled);
  const locked = uploadButton.disabled;

  async function run(action, work) {
    setPending({ [action]: true });
    setError("");
    try {
      await work();
    } finally {
      setPending({});
    }
  }

  async function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isDocxFile(file)) {
      setError(NOT_A_DOCX_MESSAGE);
      return;
    }
    await run("upload", async () => {
      try {
        await onUpload(file);
      } catch (e) {
        setError(e?.status === 400 || e?.status === 413 ? e.message : friendly(e, "Adanse couldn't read that document. Please try again."));
      }
    });
  }

  // Document side only: copy this document objective's wording into
  // Research Context (same position, or added at the end). The panel
  // re-checks matches from the saved project straight away.
  async function useWording(position, wording) {
    await run(`wording:${position}`, async () => {
      try {
        await onUseWording(position, wording);
      } catch (e) {
        setError(friendly(e, "Couldn't update your Research Context objectives. Please try again."));
      }
    });
  }

  async function remove() {
    await run("remove", async () => {
      try {
        await onRemove();
      } catch (e) {
        setError(friendly(e, "Couldn't remove the comparison. Please try again."));
      }
    });
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
        <>
          {/* One row per document objective, in document order; a matched
              entered objective sits in its match's row (display order only:
              numbers are each objective's real position). See
              comparisonRows. */}
          <table className="chapter1-compare-table">
            {view.heading && (
              <caption className="chapter1-compare-source">
                Your document's objectives, found under “{view.heading}”
              </caption>
            )}
            <thead>
              <tr>
                <th scope="col">Your document says</th>
                <th scope="col">You entered</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows(view).map((row, i) => (
                <tr key={i}>
                  <MatchCell
                    cell={row.document}
                    side="document"
                    otherSide="entered"
                    action={
                      onUseWording && row.document && (
                        <button
                          className="chapter1-use-wording"
                          type="button"
                          disabled={wordingButton(row.document.number).disabled}
                          onClick={() => useWording(row.document.number, row.document.text)}
                        >
                          {wordingButton(row.document.number).loading ? "Saving…" : "Use this wording →"}
                        </button>
                      )
                    }
                  />
                  <MatchCell cell={row.entered} side="entered" otherSide="document" />
                </tr>
              ))}
            </tbody>
          </table>

          {view.entered.length === 0 && (
            <p className="chapter1-compare-note">No objectives saved in Research Context yet.</p>
          )}

          <div className="chapter1-compare-note">
            Your document's objectives are quoted word for word, in the order
            they appear. Each of yours is shown beside the one it matches
            exactly, keeping its own number; any without a match follow.
            “Use this wording” puts a line's wording into your Research Context
            objectives: it replaces the objective with the same number, or is
            added at the end if you have fewer.
          </div>
        </>
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
          disabled={uploadButton.disabled}
          onClick={() => inputRef.current?.click()}
        >
          {uploadButton.loading
            ? "Reading…"
            : view.state === "none"
            ? "Upload Chapter 1–3 (.docx)"
            : "Upload a different document"}
        </button>

        {view.state !== "none" && (
          <button className="btn btn-secondary" type="button" disabled={removeButton.disabled} onClick={remove}>
            {removeButton.loading ? "Removing…" : "Remove"}
          </button>
        )}
      </div>
    </section>
  );
}
