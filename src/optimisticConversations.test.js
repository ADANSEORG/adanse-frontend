import { test } from "node:test";
import assert from "node:assert/strict";

import {
  draftConversation,
  draftProject,
  mergeServerConversation,
  newConversationId,
  pinLimitError,
  pinLimitReached,
  restoreConversation,
} from "./optimisticConversations.js";
import { isValidProjectId } from "./projectRoutes.js";
import { pinErrorMessage } from "./sidebarGroups.js";

test("new ids are valid project ids, with or without randomUUID", () => {
  assert.ok(isValidProjectId(newConversationId()));

  const noRandomUuid = {
    getRandomValues: (bytes) => globalThis.crypto.getRandomValues(bytes),
  };
  const id = newConversationId(noRandomUuid);
  assert.ok(isValidProjectId(id));
  assert.equal(id[14], "4"); // version 4
  assert.ok("89ab".includes(id[19])); // RFC 4122 variant
});

test("draft conversation looks like a fresh unpinned server row", () => {
  const draft = draftConversation("abc", new Date("2026-11-18T10:00:00Z"));
  assert.deepEqual(draft, {
    id: "abc",
    title: "New Analysis",
    created_at: "2026-11-18T10:00:00.000Z",
    updated_at: "2026-11-18T10:00:00.000Z",
    pinned_at: null,
  });
  assert.equal(draftProject("abc").draft, true);
  assert.equal(draftProject("abc").conversation_id, "abc");
});

test("server copy replaces the draft but keeps UI-only fields", () => {
  const list = [
    { id: "a", title: "New Analysis", dataset_uploaded: true },
    { id: "b", title: "Other" },
  ];
  const merged = mergeServerConversation(list, {
    id: "a",
    title: "New Analysis",
    created_at: "server",
  });
  assert.deepEqual(merged[0], {
    id: "a",
    title: "New Analysis",
    dataset_uploaded: true,
    created_at: "server",
  });
  assert.equal(merged[1], list[1]);
});

test("server copy never resurrects a conversation removed meanwhile", () => {
  const merged = mergeServerConversation([{ id: "b" }], { id: "a" });
  assert.deepEqual(merged, [{ id: "b" }]);
});

test("a failed delete puts the conversation back at its old place", () => {
  const list = [{ id: "a" }, { id: "c" }];
  assert.deepEqual(
    restoreConversation(list, { id: "b" }, 1).map((c) => c.id),
    ["a", "b", "c"]
  );
  // Index past the end (list shrank meanwhile) appends.
  assert.deepEqual(
    restoreConversation([{ id: "a" }], { id: "b" }, 5).map((c) => c.id),
    ["a", "b"]
  );
  // Already back (e.g. a reload re-listed it): no duplicate.
  assert.equal(restoreConversation(list, { id: "a" }, 0), list);
});

test("pin limit is checked locally with the backend's wording", () => {
  const three = [
    { id: "a", pinned_at: "t" },
    { id: "b", pinned_at: "t" },
    { id: "c", pinned_at: "t" },
    { id: "d", pinned_at: null },
  ];
  assert.equal(pinLimitReached(three), true);
  assert.equal(pinLimitReached(three.slice(1)), false);
  assert.equal(
    pinErrorMessage(pinLimitError()),
    "You can pin up to 3 projects. Unpin one to pin this."
  );
});
