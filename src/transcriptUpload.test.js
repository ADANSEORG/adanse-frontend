import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  INTERVIEW_GUIDANCE_STEPS,
  transcriptFileType,
  transcriptNotice,
} from "./transcriptUpload.js";

test("Word and text transcripts are recognised by extension, in any case", () => {
  assert.equal(transcriptFileType({ name: "Interview P1.docx" }), "docx");
  assert.equal(transcriptFileType({ name: "notes.DOC" }), "doc");
  assert.equal(transcriptFileType({ name: "focus-group.txt" }), "txt");
});

test("spreadsheets and anything else are not treated as transcripts", () => {
  for (const name of ["survey.csv", "data.xlsx", "data.xls", "thesis.pdf", "docx", "", undefined]) {
    assert.equal(transcriptFileType(name === undefined ? null : { name }), null, String(name));
  }
});

test("the notice names the kind of file and says a spreadsheet works today", () => {
  assert.match(transcriptNotice("docx"), /^Word documents can't be uploaded yet/);
  assert.match(transcriptNotice("txt"), /^Text files can't be uploaded yet/);
  assert.match(transcriptNotice("doc"), /spreadsheet/);
});

test("the guidance says exactly what the spreadsheet should look like", () => {
  const text = INTERVIEW_GUIDANCE_STEPS.join(" ");
  assert.match(text, /one row per participant, one column per question/);
  assert.match(text, /under about 1,500 words/);
  assert.match(text, /P1, P2/);
});

test("the upload zone intercepts transcripts and only then offers the waitlist", () => {
  const zone = readFileSync(new URL("./components/UploadZone.jsx", import.meta.url), "utf8");
  // A transcript never reaches the dataset upload.
  assert.match(
    zone,
    /const fileType = transcriptFileType\(file\);\s*if \(fileType\) \{[^}]*setTranscript\(fileType\);\s*return;/
  );
  // The waitlist panel is rendered only once a transcript was dropped.
  assert.match(zone, /\{transcript && \(/);
  assert.match(zone, /joinTranscriptWaitlist\(transcript\)/);
});
