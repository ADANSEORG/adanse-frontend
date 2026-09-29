// Google sign-in (Supabase OAuth) helpers, kept free of window/import.meta so
// they run under plain node:test. AuthContext.jsx and AuthScreen.jsx pass the
// browser's values in.

import { resolveSiteUrl } from "./siteUrl.js";

// Where Google (via Supabase) sends the browser back to: the site root, built
// the same way as the password-reset link, so production, previews and local
// dev each come back to themselves. Must be in the Supabase project's
// Redirect URLs allow-list, or Supabase falls back to its Site URL.
export function oauthRedirectUrl(configuredSiteUrl, fallbackOrigin) {
  return `${resolveSiteUrl(configuredSiteUrl, fallbackOrigin)}/`;
}

// When a Google sign-in does not complete (the person cancels on Google's
// screen, or the provider errors), Supabase redirects back with
// error / error_description in the query string or, with the implicit flow, in
// the hash. Returns a message to show on the sign-in screen, or null when the
// URL carries no OAuth error.
export function oauthErrorMessage(search, hash) {
  const params = [search, hash]
    .map((part) => new URLSearchParams(String(part || "").replace(/^[?#]/, "")))
    .find((p) => p.has("error") || p.has("error_description"));

  if (!params) return null;

  if (params.get("error") === "access_denied") {
    return "Google sign-in was cancelled. You can try again, or use your email and password.";
  }

  const detail = (params.get("error_description") || "").replace(/\+/g, " ").trim();
  return detail
    ? `Google sign-in didn't complete: ${detail}`
    : "Google sign-in didn't complete. Please try again.";
}
