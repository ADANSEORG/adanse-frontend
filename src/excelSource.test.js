import { test } from "node:test";
import assert from "node:assert/strict";

import { excelSourceNote } from "./excelSource.js";

test("names the sheet that was read and the ones ignored", () => {
  assert.equal(
    excelSourceNote({
      source_sheet: "Responses",
      ignored_sheets: ["Read Me", "Codebook", "Questionnaire Mapping"],
    }),
    'Read sheet "Responses". Ignored: "Read Me", "Codebook", "Questionnaire Mapping".'
  );
});

test("mentions a header row below title rows", () => {
  assert.equal(
    excelSourceNote({ header_row: 4 }),
    "Column names taken from row 4."
  );
});

test("combines sheet and header row", () => {
  assert.equal(
    excelSourceNote({
      source_sheet: "Data",
      ignored_sheets: ["Notes"],
      header_row: 3,
    }),
    'Read sheet "Data". Ignored: "Notes". Column names taken from row 3.'
  );
});

test("nothing to say for CSV, single-sheet files and older versions", () => {
  assert.equal(excelSourceNote(undefined), null);
  assert.equal(excelSourceNote({}), null);
  assert.equal(excelSourceNote({ actions_applied: [] }), null);
  assert.equal(excelSourceNote({ header_row: 1 }), null);
  assert.equal(
    excelSourceNote({ source_sheet: "Sheet1", ignored_sheets: [] }),
    null
  );
});
