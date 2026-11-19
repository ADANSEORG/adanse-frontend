/*
 * Optimistic updates for the conversation sidebar: creating, deleting,
 * pinning and unpinning show on screen immediately and the request runs in
 * the background. These pure helpers compute the "show it now" list and the
 * "put it back" list if the server refuses, so they are testable under plain
 * node:test (same pattern as sidebarGroups.js).
 */

import { isPinned } from "./sidebarGroups.js";

// Mirrors the backend's MAX_PINNED_PROJECTS (app/core/config.py). Checked
// locally only so a 4th pin is refused instantly instead of flashing into the
// Pinned group and back out; the backend still enforces the real limit.
export const MAX_PINNED_PROJECTS = 3;

// The same title the backend gives a conversation created without one.
export const NEW_CONVERSATION_TITLE = "New Analysis";

// The empty project a new conversation starts with.
export const NEW_PROJECT_FIELDS = Object.freeze({
  title: "Untitled research",
  objectives: [],
  research_questions: [],
  hypotheses: [],
  methodology: "",
});

/** A v4 UUID for a new conversation, chosen here so the UI can open it
 * before the create request returns. */
export function newConversationId(cryptoImpl = globalThis.crypto) {
  if (cryptoImpl?.randomUUID) {
    return cryptoImpl.randomUUID();
  }
  // randomUUID needs a secure context (https / localhost); getRandomValues
  // doesn't.
  const bytes = cryptoImpl.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

/** The sidebar entry shown for a new conversation until the server's copy
 * arrives. */
export function draftConversation(id, now = new Date()) {
  const stamp = now.toISOString();
  return {
    id,
    title: NEW_CONVERSATION_TITLE,
    created_at: stamp,
    updated_at: stamp,
    pinned_at: null,
  };
}

/** The placeholder project for a draft conversation. `draft: true` marks it
 * so the real project replaces it only if nothing newer has. */
export function draftProject(conversationId) {
  return { ...NEW_PROJECT_FIELDS, conversation_id: conversationId, draft: true };
}

/** Swap the server's copy of a conversation into the list, keeping fields
 * only the UI tracks (progress tags). Never re-adds one that was removed
 * meanwhile (e.g. deleted while it was still being created). */
export function mergeServerConversation(conversations, server) {
  return (conversations || []).map((conversation) =>
    conversation.id === server.id ? { ...conversation, ...server } : conversation
  );
}

/** Put a conversation whose delete failed back where it was. */
export function restoreConversation(conversations, conversation, index) {
  const list = conversations || [];
  if (list.some((c) => c.id === conversation.id)) {
    return list;
  }
  const at = Math.max(0, Math.min(index ?? 0, list.length));
  return [...list.slice(0, at), conversation, ...list.slice(at)];
}

export function pinLimitReached(conversations, max = MAX_PINNED_PROJECTS) {
  return (conversations || []).filter(isPinned).length >= max;
}

/** Same shape and wording as the backend's 409, so pinErrorMessage() shows
 * it unchanged. */
export function pinLimitError(max = MAX_PINNED_PROJECTS) {
  const noun = max === 1 ? "project" : "projects";
  const error = new Error(`You can pin up to ${max} ${noun}. Unpin one to pin this.`);
  error.status = 409;
  return error;
}
