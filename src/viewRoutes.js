import { historyIndex } from "./projectRoutes.js";

// URL <-> screen mapping for the two settings pages.
//
// Account and Credits used to exist only as the in-memory `step`, so reloading
// either one (or opening it in a new tab) dropped the researcher on the empty
// "new project" screen. They are now real routes: the path decides whether one
// of them is showing, and everything else about the workflow (the selected
// project, its `step`) is left exactly as it was underneath, so Back returns to
// it. Project screens are not routes yet.
//
// Pure helpers, kept apart from React so they can be tested on their own.

const SETTINGS_PATHS = Object.freeze({
  account: "/account",
  credits: "/credits",
});

// "account" | "credits" | null for a location's pathname (query and hash are
// not part of it, so "/credits?reference=..." from a payment return still
// matches). Case and a trailing slash don't matter, as with the router itself.
export function settingsViewForPath(pathname) {
  if (typeof pathname !== "string") return null;

  const clean = pathname.toLowerCase().replace(/\/+$/, "");

  for (const [view, path] of Object.entries(SETTINGS_PATHS)) {
    if (clean === path) return view;
  }

  return null;
}

// The path that opens a settings view, or null for anything else.
export function pathForSettingsView(view) {
  return Object.hasOwn(SETTINGS_PATHS, view) ? SETTINGS_PATHS[view] : null;
}

// Where the Back button on a settings page goes. `historyState` is
// window.history.state: an `idx` of 0 means this is the first entry of ours in
// the tab (a reload, a link opened in a new tab, or an entry that replaced it --
// there is nothing of ours to go back to), otherwise the previous history entry
// is one of ours. See projectRoutes.js's historyIndex for why not location.key.
// Returns -1 (step back in history) or the path to replace this entry with.
export function settingsBackTarget(historyState) {
  return historyIndex(historyState) > 0 ? -1 : "/";
}
