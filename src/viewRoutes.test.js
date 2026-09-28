import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  pathForSettingsView,
  settingsBackTarget,
  settingsViewForPath,
} from "./viewRoutes.js";

// ---------------------------------------------------------------------------
// Path -> view
// ---------------------------------------------------------------------------
test("/account and /credits are the settings views", () => {
  assert.equal(settingsViewForPath("/account"), "account");
  assert.equal(settingsViewForPath("/credits"), "credits");
});

test("a trailing slash and letter case do not matter, as with the router", () => {
  assert.equal(settingsViewForPath("/account/"), "account");
  assert.equal(settingsViewForPath("/credits//"), "credits");
  assert.equal(settingsViewForPath("/Credits"), "credits");
  assert.equal(settingsViewForPath("/ACCOUNT"), "account");
});

test("the main page and every other path are not settings views", () => {
  for (const path of ["/", "", "/accounts", "/account/extra", "/credit", "/creditsx", "/project/abc/analysis", "/payment/callback", "/privacy", "/terms", "/reset-password", "/x/account"]) {
    assert.equal(settingsViewForPath(path), null, path);
  }
});

test("a pathname that is not a string is not a settings view", () => {
  for (const value of [undefined, null, 42, {}, []]) {
    assert.equal(settingsViewForPath(value), null);
  }
});

test("a payment return that lands on /credits?reference=... is still Credits (only the pathname is read)", () => {
  assert.equal(settingsViewForPath(new URL("https://x.test/credits?reference=abc&trxref=abc").pathname), "credits");
});

// ---------------------------------------------------------------------------
// View -> path
// ---------------------------------------------------------------------------
test("each settings view has its path, and the two round-trip", () => {
  assert.equal(pathForSettingsView("account"), "/account");
  assert.equal(pathForSettingsView("credits"), "/credits");
  for (const view of ["account", "credits"]) {
    assert.equal(settingsViewForPath(pathForSettingsView(view)), view);
  }
});

test("anything that is not a settings view has no path (including inherited property names)", () => {
  for (const value of ["setup", "workspace", "chapter4", "", undefined, null, "constructor", "toString", "__proto__"]) {
    assert.equal(pathForSettingsView(value), null, String(value));
  }
});

// ---------------------------------------------------------------------------
// Back
// ---------------------------------------------------------------------------
test("Back steps through history when an earlier entry of ours exists", () => {
  assert.equal(settingsBackTarget("k8f2ab"), -1);
  assert.equal(settingsBackTarget("abc123"), -1);
});

test("after a reload or a link opened in a new tab (first entry) Back goes to the main page", () => {
  assert.equal(settingsBackTarget("default"), "/");
});

test("with no key at all Back goes to the main page rather than leaving the app", () => {
  for (const key of [undefined, null, ""]) {
    assert.equal(settingsBackTarget(key), "/");
  }
});

// ---------------------------------------------------------------------------
// Wiring: the URL, not `step`, decides these two screens. These keep the pieces
// on the helpers rather than each working the path out for itself.
// ---------------------------------------------------------------------------
const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("App shows Account and Credits from the URL-derived view, not from `step`", () => {
  const app = source("./App.jsx");
  assert.match(app, /const isAccount\s*=\s*settingsView === "account"/);
  assert.match(app, /const isCredits\s*=\s*settingsView === "credits"/);
  assert.doesNotMatch(app, /step === "(account|credits)"/);
});

test("the workflow no longer treats account or credits as steps", () => {
  const hook = source("./hooks/useThesisWorkflow.js");
  assert.doesNotMatch(hook, /setStep\("(account|credits)"\)/);
  assert.doesNotMatch(hook, /returnStep|setReturnStep/);
  assert.match(hook, /settingsViewForPath\(location\.pathname\)/);
});

test("choosing or creating a project leaves the settings page", () => {
  const hook = source("./hooks/useThesisWorkflow.js");
  for (const name of ["newChat", "select"]) {
    const body = hook.slice(hook.indexOf(`const ${name} = async`));
    assert.match(body.slice(0, body.indexOf("\n  };")), /leaveSettings\(\);/, `${name} must call leaveSettings()`);
  }
});

test("both Back buttons use the history-aware handler, and opening a page you are on adds no entry", () => {
  const hook = source("./hooks/useThesisWorkflow.js");
  assert.match(hook, /const backFromAccount\s*=\s*backFromSettings/);
  assert.match(hook, /const backFromCredits\s*=\s*backFromSettings/);
  assert.match(hook, /location\.pathname !== path/);
});

test("signing out leaves the settings URL", () => {
  const app = source("./App.jsx");
  const handler = app.slice(app.indexOf("async function handleSignOut"));
  assert.match(handler.slice(0, handler.indexOf("\n  }")), /await signOut\(\);\s*leaveSettings\(\);/);
  assert.equal((app.match(/onSignOut=\{\s*handleSignOut\s*\}/g) || []).length, 2, "sidebar and Account both sign out through it");
});
