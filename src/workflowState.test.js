import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(
  new URL("./hooks/useThesisWorkflow.js", import.meta.url),
  "utf8"
);

const bodyOf = (name) => {
  const start = workflow.indexOf(`const ${name} = async`);
  const end = workflow.slice(start).search(/\r?\n  };\r?\n/);

  assert.ok(start > 0 && end > 0, name);

  return workflow.slice(start, start + end);
};

test("a new chat opens immediately and creates the project in the background", () => {
  const body = bodyOf("newChat");

  // The placeholder project is set before the active id switches, so the
  // setup screen never renders a new conversation with the previous project.
  const draft = body.indexOf("setProject(draftProject(id))");
  const switchActive = body.indexOf("setActive(draft)");
  assert.ok(draft > 0 && switchActive > draft, "draft project before setActive(draft)");

  // Nothing is awaited before the screen switches.
  const navigate = body.indexOf("pushStep(projectPath(id, \"setup\"))");
  assert.ok(navigate > 0);
  assert.doesNotMatch(body.slice(0, navigate), /await /);

  // The server copy uses the same client-chosen id, and the real project
  // replaces only the untouched placeholder.
  assert.match(body, /createConversation\(undefined, id\)/);
  assert.match(
    body,
    /current\?\.draft && current\.conversation_id === id\s*\?\s*freshProject/
  );

  // Anything needing the server copy waits for it.
  assert.match(body, /pendingCreatesRef\.current\.set\(id, creation\)/);
  assert.match(bodyOf("saveSetup"), /await whenCreated\(c\.id\);\s*p = await updateThesisProject/);
  assert.match(bodyOf("deleteChat"), /await whenCreated\(c\.id\)/);
});

test("a project that loads after the user moved on doesn't overwrite the screen", () => {
  assert.match(bodyOf("newChat"), /navigationSeqRef\.current \+= 1/);
  assert.match(bodyOf("select"), /if \(navigationSeqRef\.current !== seq\) return;/);
});

test("delete and pin update the sidebar before their requests and undo on failure", () => {
  const del = bodyOf("deleteChat");
  assert.ok(
    del.indexOf("setConversations((x) => x.filter(") <
      del.indexOf("await deleteConversation(c.id)")
  );
  assert.match(del, /restoreConversation\(x, c, index\)/);

  const pin = bodyOf("pinChat");
  assert.ok(pin.indexOf("withPinnedAt(list, c.id, optimistic)") < pin.indexOf("await pinConversation("));
  assert.match(pin, /withPinnedAt\(list, c\.id, previous\)/);

  const unpin = bodyOf("unpinChat");
  assert.ok(unpin.indexOf("withPinnedAt(list, c.id, null)") < unpin.indexOf("await unpinConversation("));
  assert.match(unpin, /withPinnedAt\(list, c\.id, previous\)/);
});

test("opening a project does not fetch message history the app never renders", () => {
  assert.doesNotMatch(bodyOf("select"), /listMessages\(/);
});

test("opening a project reuses the conversation row when one is already loaded", () => {
  assert.match(
    bodyOf("select"),
    /knownConversation\s*\?\s*c\s*:\s*getConversation\(c\.id\)/
  );
});

test("opening Credits does not fetch credits before Credits itself loads them", () => {
  const body = workflow.slice(workflow.indexOf("const openCredits ="));

  assert.doesNotMatch(
    body.slice(0, body.indexOf("const backFromCredits")),
    /getCredits\(/
  );
});

test("a new chat clears the previous dataset review copy", () => {
  assert.match(bodyOf("newChat"), /setDatasetVersion\(null\)/);
});

test("opening a project that is not on review drops the previous dataset version", () => {
  assert.match(
    bodyOf("select"),
    /setDatasetVersion\(\s*routeStep === "review"\s*\? pendingVersion\s*:\s*null\s*\)/
  );
});

test("saving Research Context uses its mutation response instead of re-reading the project", () => {
  const body = bodyOf("saveSetup");

  assert.doesNotMatch(body, /getThesisProject\(/);
  assert.match(body, /p = await createThesisProject\(/);
  assert.match(body, /p = await updateThesisProject\(/);
});

test("building a plan and running analysis apply their responses instead of re-reading the project", () => {
  const build = bodyOf("build");

  assert.doesNotMatch(build, /getThesisProject\(/);
  assert.match(build, /analysis_plan:\s*p/);

  const run = bodyOf("run");

  assert.doesNotMatch(run, /getThesisProject\(/);
  assert.match(run, /analysis_results:\s*a/);
});
