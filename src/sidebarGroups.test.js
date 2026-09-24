import { test } from "node:test";
import assert from "node:assert/strict";

import {
  groupConversations,
  isPinned,
  pinErrorMessage,
  withPinnedAt,
} from "./sidebarGroups.js";

const NOW = new Date(2026, 8, 24, 12, 0, 0); // 24 Sep 2026, local noon
const day = (offset) => new Date(2026, 8, 24 + offset, 9, 0, 0).toISOString();

const conv = (id, updatedOffset, pinnedAt = null) => ({
  id,
  title: id,
  updated_at: day(updatedOffset),
  created_at: day(updatedOffset),
  pinned_at: pinnedAt,
});

test("with nothing pinned there is no Pinned group, and date groups are as before", () => {
  const groups = groupConversations(
    [conv("t", 0), conv("y", -1), conv("o", -5)],
    NOW
  );
  assert.deepEqual(groups.map((g) => g.label), ["Today", "Yesterday", "Older"]);
});

test("Pinned comes first, above the date groups", () => {
  const groups = groupConversations(
    [conv("t", 0), conv("p", -9, day(-2))],
    NOW
  );
  assert.deepEqual(groups.map((g) => g.label), ["Pinned", "Today"]);
  assert.deepEqual(groups[0].items.map((c) => c.id), ["p"]);
});

test("a pinned conversation does not also appear in a date group", () => {
  const groups = groupConversations(
    [conv("p", 0, day(-1)), conv("t", 0)],
    NOW
  );
  const today = groups.find((g) => g.label === "Today");
  assert.deepEqual(today.items.map((c) => c.id), ["t"]);
  const everywhere = groups.flatMap((g) => g.items.map((c) => c.id));
  assert.equal(everywhere.filter((id) => id === "p").length, 1);
});

test("pinned items are ordered by pinned_at, most recent first", () => {
  const groups = groupConversations(
    [
      conv("first", 0, new Date(2026, 8, 20).toISOString()),
      conv("last", -3, new Date(2026, 8, 23).toISOString()),
      conv("mid", -1, new Date(2026, 8, 21).toISOString()),
    ],
    NOW
  );
  assert.deepEqual(groups[0].items.map((c) => c.id), ["last", "mid", "first"]);
});

test("an unpinned conversation returns to the date group its updated_at puts it in", () => {
  const list = [conv("a", -1, day(0))];
  assert.deepEqual(groupConversations(list, NOW).map((g) => g.label), ["Pinned"]);
  const unpinned = withPinnedAt(list, "a", null);
  const groups = groupConversations(unpinned, NOW);
  assert.deepEqual(groups.map((g) => g.label), ["Yesterday"]);
});

test("withPinnedAt changes only pinned_at, and only on the matching conversation", () => {
  const list = [conv("a", -1), conv("b", 0)];
  const next = withPinnedAt(list, "a", "2026-09-24T10:00:00Z");
  assert.equal(next[0].pinned_at, "2026-09-24T10:00:00Z");
  assert.equal(next[0].updated_at, list[0].updated_at);
  assert.equal(next[0].title, "a");
  assert.deepEqual(next[1], list[1]);
  assert.equal(list[0].pinned_at, null); // input not mutated
});

test("isPinned is false for missing/empty pinned_at (older backends)", () => {
  assert.equal(isPinned({}), false);
  assert.equal(isPinned({ pinned_at: null }), false);
  assert.equal(isPinned(undefined), false);
  assert.equal(isPinned({ pinned_at: "2026-09-24T10:00:00Z" }), true);
});

test("the backend's pin-limit message is shown verbatim, not swallowed", () => {
  const error = Object.assign(
    new Error("You can pin up to 3 projects. Unpin one to pin this."),
    { status: 409 }
  );
  assert.equal(
    pinErrorMessage(error),
    "You can pin up to 3 projects. Unpin one to pin this."
  );
});

test("other failures get a generic message rather than a raw error", () => {
  assert.match(pinErrorMessage(Object.assign(new Error("boom"), { status: 500 })), /try again/i);
  assert.match(pinErrorMessage(new Error("Failed to fetch")), /try again/i);
});

test("empty and undefined lists don't throw", () => {
  assert.deepEqual(groupConversations([], NOW), []);
  assert.deepEqual(groupConversations(undefined, NOW), []);
});
