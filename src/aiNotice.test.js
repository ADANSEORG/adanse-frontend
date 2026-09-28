import { test } from "node:test";
import assert from "node:assert/strict";

import { AI_PROVIDERS, QUALITATIVE_AI_NOTICE } from "./aiNotice.js";

const text = [QUALITATIVE_AI_NOTICE.heading, ...QUALITATIVE_AI_NOTICE.paragraphs].join(" ");

test("the notice names every provider that can receive the text", () => {
  assert.deepEqual(AI_PROVIDERS, ["Groq", "Cerebras"]);
  for (const provider of AI_PROVIDERS) assert.match(text, new RegExp(provider));
});

test("it says free text is sent to third-party AI providers, along with the objectives", () => {
  assert.match(text, /open-ended answers/);
  assert.match(text, /third-party AI providers/);
  assert.match(text, /research objectives/);
});

test("it says what is NOT sent (other columns)", () => {
  assert.match(text, /Other columns of your dataset are not sent/);
});

test("it warns that details typed inside an answer are sent as written", () => {
  assert.match(text, /sent as written/);
  assert.match(text, /a name, a phone number, a workplace/);
});

test("it asks the researcher to make sure respondents were told", () => {
  assert.match(text, /respondents were told/);
});

test("it does not claim anything is masked, removed or anonymised (that is not true of names)", () => {
  assert.doesNotMatch(text, /mask|anonymi[sz]|redact|removed automatically|scrub/i);
});
