import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  initialAuthState,
  isNetworkAuthFailure,
  storedSessionUser,
  urlHasAuthReturn,
} from "./sessionBootstrap.js";

const KEY = "sb-abcdef-auth-token";
const storageWith = (value) => ({ getItem: (k) => (k === KEY ? value : null) });
const session = (overrides = {}) =>
  JSON.stringify({
    access_token: "a",
    refresh_token: "r",
    expires_at: 1,
    user: { id: "u1", email: "x@example.com", user_metadata: {} },
    ...overrides,
  });

test("a saved Supabase session gives the user straight away (even with an expired access token)", () => {
  const user = storedSessionUser(storageWith(session()), KEY);
  assert.equal(user.id, "u1");
});

test("no saved session, or an unusable one, gives no user", () => {
  for (const value of [
    null,
    "",
    "not json",
    "null",
    session({ refresh_token: "" }),
    session({ refresh_token: undefined }),
    session({ user: null }),
    session({ user: { email: "no id" } }),
  ]) {
    assert.equal(storedSessionUser(storageWith(value), KEY), null, String(value));
  }
  assert.equal(storedSessionUser(null, KEY), null);
  assert.equal(storedSessionUser(storageWith(session()), ""), null);
  assert.equal(
    storedSessionUser({ getItem: () => { throw new Error("blocked"); } }, KEY),
    null
  );
});

test("links Supabase must process first are recognised", () => {
  assert.equal(urlHasAuthReturn("", "#access_token=x&refresh_token=y&type=bearer"), true);
  assert.equal(urlHasAuthReturn("?code=abc", ""), true);
  assert.equal(urlHasAuthReturn("", "#access_token=x&type=recovery"), true);
  assert.equal(urlHasAuthReturn("?token_hash=t&type=signup", ""), true);
  assert.equal(urlHasAuthReturn("?error=access_denied&error_description=No", ""), true);
  assert.equal(urlHasAuthReturn("", ""), false);
  assert.equal(urlHasAuthReturn("?tab=analysis", "#section"), false);
});

test("the app shows at once unless a sign-in link is being processed", () => {
  const user = { id: "u1" };
  assert.deepEqual(initialAuthState({ storedUser: user, authReturn: false }), { user, loading: false });
  assert.deepEqual(initialAuthState({ storedUser: null, authReturn: false }), { user: null, loading: false });
  assert.deepEqual(initialAuthState({ storedUser: user, authReturn: true }), { user: null, loading: true });
});

test("only a rejected session signs someone out, not a dropped connection", () => {
  assert.equal(isNetworkAuthFailure({ name: "AuthRetryableFetchError", status: 0 }), true);
  assert.equal(isNetworkAuthFailure(new TypeError("Failed to fetch")), true);
  assert.equal(isNetworkAuthFailure({ name: "AuthApiError", status: 401, message: "Invalid JWT" }), false);
  assert.equal(isNetworkAuthFailure({ name: "AuthSessionMissingError", status: 400, message: "Auth session missing!" }), false);
});

test("AuthContext boots from the saved session and App no longer says 'Checking your session'", () => {
  const auth = readFileSync(new URL("./AuthContext.jsx", import.meta.url), "utf8");
  assert.match(auth, /useState\(bootAuthState\)/);
  assert.match(auth, /storedSessionUser\(storage, supabase\.storageKey\)/);
  assert.doesNotMatch(auth, /useState\(true\)/);
  assert.match(auth, /!isNetworkAuthFailure\(error\)/);
  const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /Checking your session/);
});
