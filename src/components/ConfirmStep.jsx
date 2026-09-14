import { useState } from "react";

export default function ConfirmStep({ suggestion, columns, onConfirm, loading }) {
  const [columnA, setColumnA] = useState(suggestion.column_a);
  const [columnB, setColumnB] = useState(suggestion.column_b);
  const [editing, setEditing] = useState(false);

  return (
    <div className="card">
      <div className="card-label">We think you're comparing</div>

      {!editing ? (
        <>
          <div className="suggestion-pair">
            {columnA} <span className="vs">vs</span> {columnB}
          </div>
          <div className="suggestion-reasoning">{suggestion.reasoning}</div>
        </>
      ) : (
        <div className="override-row">
          <select value={columnA} onChange={(e) => setColumnA(e.target.value)}>
            {columns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={columnB} onChange={(e) => setColumnB(e.target.value)}>
            {columns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="action-row">
        <button
          className="btn btn-primary"
          onClick={() => onConfirm(columnA, columnB)}
          disabled={loading}
        >
          {loading ? "Running analysis…" : "Looks right — analyze it"}
        </button>
        <button className="btn btn-secondary" onClick={() => setEditing(!editing)} disabled={loading}>
          {editing ? "Cancel" : "Pick different columns"}
        </button>
      </div>
    </div>
  );
}
