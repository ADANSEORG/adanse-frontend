// Where bare "/" reopens: the last project + step a signed-in user was on,
// remembered per user in localStorage (decision: localStorage, not
// sessionStorage -- a reload in the SAME tab is the common case this exists
// for, but there is no requirement it stay tab-local).
//
// Per G1, this is read only to resolve a bare "/" -- it is never the source
// of truth while a URL already names a project. Written only from an
// already-resolved, allowed project view (never from a blocked step or a
// 404), so it can't itself steer someone back into a redirect.
//
// localStorage can throw (private browsing in some browsers, storage
// disabled, quota) or simply be unavailable (no `localStorage` global at
// all, e.g. these modules' own tests, which run under plain Node) -- every
// call goes through `storage()` and is wrapped so a storage failure
// degrades to "no last visited project", never a crash. Read via
// `globalThis.localStorage` rather than `window.localStorage`: the two are
// the same object in a real browser, but only the former is safe to
// reference when `window` itself may not exist.
import { isProjectStep, isValidProjectId } from "./projectRoutes.js";

const KEY_PREFIX = "adanse:lastVisited:";

function key(userId) {
  return `${KEY_PREFIX}${userId}`;
}

function storage() {
  return globalThis.localStorage;
}

// { projectId, step } for this user, or null if there is none / it is
// malformed / storage is unavailable. Malformed data (a corrupted or
// hand-edited value) is treated the same as none, never thrown.
export function getLastVisited(userId) {
  if (!userId) return null;

  let raw;
  try {
    raw = storage().getItem(key(userId));
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !isValidProjectId(parsed.projectId) ||
    !isProjectStep(parsed.step)
  ) {
    return null;
  }

  return { projectId: parsed.projectId, step: parsed.step };
}

export function setLastVisited(userId, projectId, step) {
  if (!userId || !isValidProjectId(projectId) || !isProjectStep(step)) return;

  try {
    storage().setItem(
      key(userId),
      JSON.stringify({ projectId, step })
    );
  } catch {
    // Best-effort: worst case bare "/" falls back to the blank form.
  }
}

export function clearLastVisited(userId) {
  if (!userId) return;

  try {
    storage().removeItem(key(userId));
  } catch {
    // Nothing to do; already effectively cleared as far as this session
    // is concerned.
  }
}
