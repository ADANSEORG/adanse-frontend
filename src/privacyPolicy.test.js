import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The privacy policy's Chapter 1-3 section must match what the code does
// (backend app/services/chapter_extract.py and chapter1_objectives.py).
const policy = readFileSync(new URL("./legal/privacy-policy.md", import.meta.url), "utf8").replace(/\s+/g, " ");

test("the policy no longer says the document is never sent to an AI provider", () => {
  assert.doesNotMatch(policy, /The document is not sent to any AI provider/);
});

test("the policy states what goes to the AI and what never does", () => {
  assert.match(policy, /sends \*\*short excerpts\*\* of your document to an AI model/);
  assert.match(policy, /Email addresses and phone numbers in these excerpts are replaced with placeholders before they are sent/);
  assert.match(policy, /\*\*Your title page is never sent\.\*\*/);
  assert.match(policy, /Your objectives are first looked for using fixed rules on our server, without AI/);
});

test("the policy states what is kept, and for how long", () => {
  assert.match(policy, /\*\*The file itself is not stored\.\*\*/);
  assert.match(policy, /\*\*Nothing else from your document is kept\*\*/);
  assert.doesNotMatch(policy, /Chapter 1 comparison (shows|can show)|Use this wording|choosing Remove on the Dataset step/);
  assert.match(policy, /Nothing from "Fill in from my chapters" is saved to your project unless you add it/);
  assert.match(policy, /Your planned sample size, if you give one/);
});
