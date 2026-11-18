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

test("a new chat uses the created project before switching the active id", () => {
  const body = bodyOf("newChat");
  const projectLoad = body.indexOf("const freshProject = await createThesisProject(");
  const setActive = body.indexOf("setActive(c)");

  assert.ok(projectLoad > 0, "newChat must keep the created project");
  assert.ok(setActive > projectLoad, "setActive(c) must come after the project create");
  assert.match(body, /setProject\(freshProject\)/);
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
