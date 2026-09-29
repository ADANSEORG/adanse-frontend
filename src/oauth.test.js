import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { oauthErrorMessage, oauthRedirectUrl } from "./oauth.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

// ---------------------------------------------------------------------------
// Where Google sends the browser back to
// ---------------------------------------------------------------------------

test("the redirect is the configured site's root", () => {
  assert.equal(oauthRedirectUrl("https://adanse.app", "http://127.0.0.1:5173"), "https://adanse.app/");
  assert.equal(oauthRedirectUrl("https://adanse.app/", "http://x"), "https://adanse.app/");
});

test("without a configured site URL it comes back to the page's own origin (local dev, previews)", () => {
  assert.equal(oauthRedirectUrl(undefined, "http://localhost:5173"), "http://localhost:5173/");
  assert.equal(oauthRedirectUrl("", "https://adanse-git-branch.vercel.app"), "https://adanse-git-branch.vercel.app/");
});

// ---------------------------------------------------------------------------
// Coming back without a session
// ---------------------------------------------------------------------------

test("a cancelled Google sign-in says so, whether the error is in the query or the hash", () => {
  const cancelled = "Google sign-in was cancelled. You can try again, or use your email and password.";
  assert.equal(oauthErrorMessage("?error=access_denied&error_description=The+user+denied", ""), cancelled);
  assert.equal(oauthErrorMessage("", "#error=access_denied&error_code=403"), cancelled);
});

test("another provider error shows Supabase's description", () => {
  assert.equal(
    oauthErrorMessage("?error=server_error&error_description=Unable+to+exchange+external+code", ""),
    "Google sign-in didn't complete: Unable to exchange external code"
  );
  assert.equal(oauthErrorMessage("?error=server_error", ""), "Google sign-in didn't complete. Please try again.");
});

test("a normal URL, or a successful return with tokens in the hash, is not an error", () => {
  for (const [search, hash] of [["", ""], [undefined, undefined], ["?reference=abc", ""], ["", "#access_token=x&refresh_token=y&type=bearer"]]) {
    assert.equal(oauthErrorMessage(search, hash), null, `${search} ${hash}`);
  }
});

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

test("AuthContext signs in with the google provider and redirects back to the site root", () => {
  const ctx = read("./AuthContext.jsx");
  assert.match(ctx, /signInWithOAuth\(\{\s*provider: "google",\s*options: \{\s*redirectTo: oauthRedirectUrl\(/);
  assert.match(ctx, /signInWithGoogle,/); // exposed on the context
});

test("the Supabase client keeps its default (implicit) flow, so password-reset links still work on another device", () => {
  // PKCE is client-wide: it would tie every reset link to the browser that requested it.
  assert.doesNotMatch(read("./supabaseClient.js"), /flowType/);
});

test("the sign-in and sign-up screens show Continue with Google after the form, and read an OAuth error on arrival", () => {
  const screen = read("./components/AuthScreen.jsx");
  const form = screen.indexOf("onSubmit={handleSubmit}");
  const google = screen.indexOf('className="auth-google"');
  assert.ok(form > 0 && google > form, "the Google button follows the email/password form");
  assert.match(screen, /onClick=\{handleGoogle\}/);
  assert.match(screen, /"Continue with Google"/);
  assert.match(screen, /oauthErrorMessage\(location\.search, location\.hash\)/);
  // One shared block renders both modes, so the button appears on sign-in and sign-up alike --
  // but not on the forgot-password or code-entry screens, which return earlier branches.
  assert.equal((screen.match(/className="auth-google"/g) || []).length, 1);
});
