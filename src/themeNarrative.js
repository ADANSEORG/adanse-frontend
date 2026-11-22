// Mirrors the backend's _clean_theme_narrative() (app/services/thesis.py):
// a theme finalized before the clean fallback summary existed stored a
// template narrative that carried an internal note ("(AI-assisted narrative
// expansion was unavailable for this theme; this is a template summary.)"),
// repeated the theme's concept and count, and listed its excerpts inline.
// The downloaded Chapter 4 already strips those; this keeps the in-app
// preview the same. An AI-written narrative contains none of them and is
// returned unchanged.

const LEGACY_NOTE =
  /\s*\(AI-assisted narrative expansion was (?:unavailable|skipped)[^)]*template summary\.\)/;
const LEGACY_COVERAGE =
  /\s*This theme was reflected in \d+ responses?(?: \([\d.]+% of classified responses\))?\./;
const LEGACY_EXCERPTS = /\s*Representative excerpts?: [\s\S]*?\(R\d+\)\.(?=\s|$)/;

export function cleanThemeNarrative(narrative, concept) {
  let text = String(narrative || "").trim();
  if (!LEGACY_NOTE.test(text)) return text;
  text = text.replace(LEGACY_NOTE, "");
  text = text.replace(LEGACY_COVERAGE, "");
  text = text.replace(LEGACY_EXCERPTS, "");
  const lead = String(concept || "").trim().replace(/\.+$/, "");
  if (lead && text.startsWith(lead)) {
    text = text.slice(lead.length).replace(/^[.\s]+/, "");
  }
  return text.trim();
}
