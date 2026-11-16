/*
 * Pure grouping for the conversation sidebar, kept out of the component so
 * it's directly testable under plain node:test (same pattern as
 * categoryOrder.js / qualitativeFinalizePolling.js).
 *
 * Pinned conversations come first in their own "Pinned" group (most recently
 * pinned first) and are NOT repeated in the date groups below it. The
 * "Pinned" group is omitted entirely when nothing is pinned. Everything else
 * is grouped by local calendar day of updated_at, exactly as before.
 *
 * A conversation counts as pinned when it has a non-empty `pinned_at`. The
 * backend already returns the list ordered pinned-first, but this sorts the
 * pinned group itself so the UI never depends on that ordering.
 */

export const PINNED_GROUP_KEY = "pinned";

function startOfLocalDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
}

export function isPinned(conversation) {
  return Boolean(conversation?.pinned_at);
}

export function groupConversations(conversations, now = new Date()) {
  const today = startOfLocalDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;

  const pinned = [];
  const dated = [
    { key: "today", label: "Today", items: [] },
    { key: "yesterday", label: "Yesterday", items: [] },
    { key: "older", label: "Older", items: [] },
  ];

  for (const conversation of conversations || []) {
    if (isPinned(conversation)) {
      pinned.push(conversation);
      continue;
    }

    const stamp = startOfLocalDay(
      new Date(conversation.updated_at || conversation.created_at)
    );

    if (stamp === today) {
      dated[0].items.push(conversation);
    } else if (stamp === yesterday) {
      dated[1].items.push(conversation);
    } else {
      dated[2].items.push(conversation);
    }
  }

  pinned.sort(
    (a, b) => new Date(b.pinned_at).getTime() - new Date(a.pinned_at).getTime()
  );

  const groups = pinned.length
    ? [{ key: PINNED_GROUP_KEY, label: "Pinned", items: pinned }, ...dated]
    : dated;

  return groups.filter((group) => group.items.length > 0);
}

// The message to show for a failed pin/unpin. A 409 is the backend's pin-limit
// rejection, and its own message ("You can pin up to 3 projects. Unpin one to
// pin this.") is exactly what the user should read -- never swallow it.
export function pinErrorMessage(error) {
  if (error?.status === 409 && error?.message) {
    return error.message;
  }
  return "Couldn't update that project's pin. Please try again.";
}

/*
 * Sidebar presentation helpers. They never change a conversation: they only
 * choose the title, date and status tag shown for one. Keeping them here means
 * the "never two identical Untitled analysis rows" rule is testable without a
 * browser.
 */

const GENERIC_TITLES = new Set([
  "",
  "new analysis",
  "untitled analysis",
  "untitled research",
]);

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function validDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function conversationDisplayTitle(conversation, now = new Date()) {
  const title = String(conversation?.title || "").trim();

  if (title && !GENERIC_TITLES.has(title.toLowerCase())) {
    return title;
  }

  const date = validDate(
    conversation?.updated_at || conversation?.created_at || now
  );

  if (!date) {
    return "Untitled analysis";
  }

  const time = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;

  return `Untitled analysis · ${date.getDate()} ${
    MONTHS[date.getMonth()]
  }, ${time}`;
}

export function conversationDate(conversation, now = new Date()) {
  const date = validDate(
    conversation?.updated_at || conversation?.created_at
  );

  if (!date) {
    return "";
  }

  const today = startOfLocalDay(now);
  const stamp = startOfLocalDay(date);

  if (stamp === today) {
    return "Today";
  }

  if (stamp === today - 24 * 60 * 60 * 1000) {
    return "Yesterday";
  }

  const sameYear = date.getFullYear() === now.getFullYear();

  return `${date.getDate()} ${MONTHS[date.getMonth()]}${
    sameYear ? "" : ` ${date.getFullYear()}`
  }`;
}

export function conversationStatus(conversation) {
  if (
    conversation?.chapter4_ready ||
    conversation?.chapter4_generated_at
  ) {
    return {
      key: "chapter4",
      label: "Chapter 4 ready",
      tone: "complete",
    };
  }

  if (
    conversation?.analysis_ready ||
    conversation?.analysis_completed_at ||
    conversation?.has_analysis
  ) {
    return {
      key: "analysis",
      label: "Analysed",
      tone: "complete",
    };
  }

  if (
    conversation?.dataset_uploaded ||
    conversation?.has_dataset ||
    conversation?.dataset_version_id ||
    conversation?.dataset_filename ||
    conversation?.dataset_path
  ) {
    return {
      key: "dataset",
      label: "Dataset added",
      tone: "progress",
    };
  }

  return {
    key: "draft",
    label: "Draft",
    tone: "draft",
  };
}

// Returns a new list with one conversation's pinned_at replaced. Touches
// nothing else on it (in particular not updated_at), so the item keeps its
// place in its date group when unpinned.
export function withPinnedAt(conversations, id, pinnedAt) {
  return (conversations || []).map((conversation) =>
    conversation.id === id
      ? { ...conversation, pinned_at: pinnedAt ?? null }
      : conversation
  );
}
