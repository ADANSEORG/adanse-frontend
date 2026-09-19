/*
 * Pure core of the password-reset redirect URL: given the configured
 * VITE_SITE_URL (or undefined/empty) and a fallback origin (the
 * browser's own, in real use), returns the site origin to redirect back
 * to, with no trailing slash.
 *
 * Kept decoupled from import.meta.env/window so it's directly testable
 * under plain node:test -- see AuthContext.jsx for the real call site,
 * which passes those two values in.
 */
export function resolveSiteUrl(configuredUrl, fallbackOrigin) {
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }
  return fallbackOrigin;
}
