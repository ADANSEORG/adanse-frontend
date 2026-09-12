import { useRef, useState } from "react";

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
            CURRENT DATASET
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
      className={`dropzone ${
        dragging ? "dragging" : ""
      } ${disabled ? "disabled" : ""}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Choose a dataset file"
      onClick={openFilePicker}
      onKeyDown={(e) => {
        if (
          !disabled &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          openFilePicker();
        }
      }}
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
      <div
        className="dropzone-icon"
        aria-hidden="true"
      >
        ↑
      </div>

      <div className="dropzone-title">
        Drop your dataset here
      </div>

      <div className="dropzone-sub">
        or{" "}
        <span>choose a file</span>{" "}
        from your computer
      </div>

      <div className="dropzone-meta">
        CSV, XLS or XLSX · up to 25 MB
      </div>

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