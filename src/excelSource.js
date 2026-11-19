// Where in an uploaded Excel workbook the dataset was read from. The backend
// records it on the dataset version's cleaning_report when it is not obvious:
//   source_sheet / ignored_sheets -- a workbook with several tabs (Read Me,
//                                    Codebook, ...): which one was analysed
//   header_row                    -- the column names were found below title
//                                    or note rows, not on row 1
// Shown on the review screen so a researcher can catch a wrong pick before
// validating the version.

function quoted(names) {
  return names.map((name) => `"${name}"`).join(", ");
}

/** One-sentence note, or null when the file was read the plain way. */
export function excelSourceNote(cleaningReport) {
  const report = cleaningReport || {};
  const parts = [];

  const ignored = Array.isArray(report.ignored_sheets)
    ? report.ignored_sheets.filter(Boolean)
    : [];
  if (report.source_sheet && ignored.length) {
    parts.push(
      `Read sheet "${report.source_sheet}". Ignored: ${quoted(ignored)}.`
    );
  }

  const headerRow = Number(report.header_row);
  if (Number.isInteger(headerRow) && headerRow > 1) {
    parts.push(`Column names taken from row ${headerRow}.`);
  }

  return parts.length ? parts.join(" ") : null;
}
