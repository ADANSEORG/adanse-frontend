import { useRef, useState } from "react";
import { FileUp } from "lucide-react";

export default function UploadZone({
  onFileSelected,
  disabled,
  currentDataset,
  onContinue,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files) {
    if (files && files[0] && !disabled) {
      onFileSelected(files[0]);
    }
  }

  function openFilePicker() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  /*
   * =========================================================
   * EXISTING DATASET
   * =========================================================
   *
   * When the user returns to the Dataset stage and a dataset
   * already exists, show the current dataset instead of
   * showing another upload dropzone.
   */

  if (currentDataset) {
    const filename =
      currentDataset.dataset_filename ||
      currentDataset.filename ||
      "Uploaded dataset";

    const rows =
      currentDataset.dataset_rows ??
      currentDataset.rows ??
      0;

    const columns =
      currentDataset.dataset_columns ||
      currentDataset.columns ||
      [];

    const columnCount = Array.isArray(columns)
      ? columns.length
      : Number(columns) || 0;

    return (
      <div className="current-dataset-card">
        <div className="current-dataset-copy">
          <div className="current-dataset-label">
            Current dataset
          </div>

          <div className="current-dataset-name">
            {filename}
          </div>

          <div className="current-dataset-meta">
            {Number(rows).toLocaleString()}{" "}
            {Number(rows) === 1
              ? "observation"
              : "observations"}{" "}
            · {columnCount}{" "}
            {columnCount === 1
              ? "variable"
              : "variables"}
          </div>
        </div>

        <div className="current-dataset-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={openFilePicker}
            disabled={disabled}
          >
            {disabled
              ? "Uploading…"
              : "Replace dataset"}
          </button>

          <button
            className="btn btn-primary"
            type="button"
            onClick={onContinue}
            disabled={disabled || !onContinue}
          >
            Continue →
          </button>
        </div>

        {/* Hidden file input used by Replace dataset */}
        <input
          ref={inputRef}
          className="current-dataset-file-input"
          type="file"
          accept=".csv,.xls,.xlsx"
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files);

            // Allows the same file to be selected again later.
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  /*
   * =========================================================
   * NO DATASET YET
   * =========================================================
   */

  return (
    <div
      className={`upload-row ${
        dragging ? "dragging" : ""
      } ${disabled ? "disabled" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();

        if (!disabled) {
          setDragging(true);
        }
      }}
      onDragLeave={() => {
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);

        handleFiles(e.dataTransfer.files);
      }}
    >
      <FileUp
        size={18}
        strokeWidth={1.8}
        className="import-row-icon"
        aria-hidden="true"
      />

      <div className="import-row-copy">
        <strong>
          {disabled
            ? "Uploading your dataset…"
            : "Upload dataset (.csv, .xls, .xlsx)"}
        </strong>

        <span>
          {disabled
            ? "This can take a moment for larger files."
            : "Drop a file here or choose one. Up to 25 MB."}
        </span>
      </div>

      <button
        className="btn btn-secondary"
        type="button"
        onClick={openFilePicker}
        disabled={disabled}
      >
        {disabled ? "Uploading…" : "Choose file"}
      </button>

      {/* Hidden native input */}
      <input
        ref={inputRef}
        className="dropzone-input"
        type="file"
        accept=".csv,.xls,.xlsx"
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);

          // Allows selecting the same file again later.
          e.target.value = "";
        }}
      />
    </div>
  );
}