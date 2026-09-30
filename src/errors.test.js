import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CONNECTION_MESSAGE, SERVER_MESSAGE, friendly } from "./errors.js";

const apiError = (status, message) => Object.assign(new Error(message), { status });

test("a dropped connection is described in plain words, never 'Failed to fetch'", () => {
  const tagged = Object.assign(new Error("NETWORK_ERROR"), { status: 0, code: "NETWORK_ERROR" });
  assert.equal(friendly(tagged), CONNECTION_MESSAGE);
  for (const raw of ["Failed to fetch", "Load failed", "NetworkError when attempting to fetch resource."]) {
    assert.equal(friendly(new TypeError(raw)), CONNECTION_MESSAGE, raw);
  }
});

test("generic server failures never reach the researcher as raw text", () => {
  for (const [status, text] of [
    [500, "Could not complete that request"],
    [500, "Internal Server Error"],
    [502, "Request failed (502)"],
    [503, "The request could not be completed."],
    [502, "The dataset could not be stored. Check Supabase Storage configuration."],
  ]) {
    assert.equal(friendly(apiError(status, text)), SERVER_MESSAGE, text);
    assert.equal(friendly(apiError(status, text), "Screen-specific wording."), "Screen-specific wording.", text);
  }
});

test("a bug in the app's own code is not shown raw", () => {
  assert.equal(
    friendly(new TypeError("Cannot read properties of undefined (reading 'id')")),
    SERVER_MESSAGE
  );
  assert.equal(friendly(new ReferenceError("x is not defined"), "Fallback."), "Fallback.");
});

test("specific, useful messages still come through", () => {
  assert.equal(
    friendly(apiError(500, "Payment was verified but credits could not be applied.")),
    "Payment was verified but credits could not be applied."
  );
  assert.equal(friendly(apiError(400, "File is too large. Maximum upload size is 10 MB.")),
    "File is too large. Maximum upload size is 10 MB.");
  // Supabase sign-in errors carry no HTTP status on our side and read fine as they are.
  assert.equal(friendly(Object.assign(new Error("Invalid login credentials"), { name: "AuthApiError" })),
    "Invalid login credentials");
});

test("existing rules are unchanged", () => {
  assert.match(friendly(apiError(401, "whatever")), /session could not be verified/);
  assert.match(friendly(apiError(402, "x")), /enough credits/);
  assert.equal(friendly(apiError(409, "Review first.")), "Review first.");
  assert.equal(friendly({}), "We couldn't complete that step. Please try again.");
});

test("screens that used to show raw error text now go through friendly()", () => {
  for (const file of ["Account", "AuthScreen", "ResetPassword", "QualitativeReview"]) {
    const source = readFileSync(new URL(`./components/${file}.jsx`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /err\??\.message\s*\|\|/, file);
    assert.match(source, /import \{ friendly \} from "\.\.\/errors\.js";/, file);
  }
});

test("the sign-in load keeps projects and credits independent", () => {
  const workflow = readFileSync(new URL("./hooks/useThesisWorkflow.js", import.meta.url), "utf8");
  assert.match(workflow, /Promise\.allSettled\(\[\s*listConversations\(\),\s*getCredits\(\),\s*\]\)/);
});
