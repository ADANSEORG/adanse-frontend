import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { cleanThemeNarrative } from "./themeNarrative.js";

const CONCEPT = "All three codes describe limits on time and money.";

test("a stored template narrative loses its internal note and repeats", () => {
  const legacy =
    "All three codes describe limits on time and money. This theme was reflected in 6 responses " +
    "(50.0% of classified responses). Representative excerpts: “I had no money” (R1); " +
    "“Time was the biggest problem” (R4). (AI-assisted narrative expansion was unavailable for " +
    "this theme; this is a template summary.)";
  assert.equal(cleanThemeNarrative(legacy, CONCEPT), "");
});

test("the rate-limit variant of the note is removed too", () => {
  const legacy =
    "Planning matters. This theme was reflected in 1 response. (AI-assisted narrative expansion " +
    "was skipped for this theme because the rate limit could not be cleared within a reasonable " +
    "wait; this is a template summary.)";
  assert.equal(cleanThemeNarrative(legacy, "Planning matters."), "");
});

test("an AI-written narrative is returned unchanged", () => {
  const written = 'Participants linked cost to delay: "I had no money" (R1).';
  assert.equal(cleanThemeNarrative(written, CONCEPT), written);
  assert.equal(cleanThemeNarrative(null, CONCEPT), "");
});

test("the Chapter 4 preview cleans narratives before showing them", () => {
  const source = readFileSync(new URL("./components/Chapter4.jsx", import.meta.url), "utf8");
  assert.match(source, /guardPrevalenceLanguage\(\s*cleanThemeNarrative\(\s*theme\?\.narrative/);
});
