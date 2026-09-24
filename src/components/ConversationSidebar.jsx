import { useEffect, useRef, useState } from "react";
import {
  Coins,
  LogOut,
  Pin,
  PinOff,
  Settings,
} from "lucide-react";

import {
  groupConversations,
  isPinned,
  pinErrorMessage,
} from "../sidebarGroups.js";
import { marqueeShift } from "../sidebarMarquee.js";

/*
 * A sidebar title that only moves when it has to. A title that fits is plain
 * static text. One that doesn't is cut off with a soft right-edge fade at
 * rest, and while `active` (row hovered, or its button keyboard-focused) it
 * slides left by exactly its overflow so the end is readable, then slides
 * back. All the motion is a CSS transform transition (see styles.css, where
 * it's also switched off for touch devices and prefers-reduced-motion); this
 * only measures.
 */
function MarqueeTitle({ text, active }) {
  const clipRef = useRef(null);
  const titleRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);
  // distance/duration persist after the pointer leaves so the slide back
  // runs at the same constant speed; `on` is what actually triggers motion.
  const [shift, setShift] = useState({
    on: false,
    distance: 0,
    duration: 1.5,
  });

  // Whether the title overflows at rest (drives the fade). Re-measured when
  // the container is resized, e.g. the sidebar changes width or the "..."/
  // delete buttons take space. offsetWidth is the layout width, so it isn't
  // thrown off by the transform while the title is mid-slide.
  useEffect(() => {
    const clip = clipRef.current;
    const title = titleRef.current;
    if (!clip || !title) return undefined;

    const measure = () =>
      setOverflowing(
        marqueeShift(
          title.offsetWidth,
          clip.clientWidth
        ) !== null
      );

    measure();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(clip);
    return () => observer.disconnect();
  }, [text]);

  // The distance to slide is measured when the title becomes active (on
  // hover/focus), not cached, so it's right for the current width.
  useEffect(() => {
    if (!active) {
      setShift((current) =>
        current.on
          ? { ...current, on: false }
          : current
      );
      return;
    }

    const clip = clipRef.current;
    const title = titleRef.current;
    if (!clip || !title) return;

    const next = marqueeShift(
      title.offsetWidth,
      clip.clientWidth
    );

    setShift(
      next
        ? { on: true, ...next }
        : (current) =>
            current.on
              ? { ...current, on: false }
              : current
    );
  }, [active, text]);

  return (
    <span
      ref={clipRef}
      className={`sidebar-item-title-clip${
        overflowing ? " overflowing" : ""
      }${shift.on ? " scrolling" : ""}`}
      title={overflowing ? text : undefined}
    >
      <span
        ref={titleRef}
        className="sidebar-item-title"
        style={{
          "--marquee-x": `-${shift.distance}px`,
          "--marquee-duration": `${shift.duration}s`,
        }}
      >
        {text}
      </span>
    </span>
  );
}

function getDisplayName(user) {
  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name;

  if (fullName?.trim()) {
    return fullName.trim();
  }

  const email = user?.email;

  if (!email) {
    return "Your account";
  }

  const local =
    email.split("@")[0] || "";

  const words = local
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return words
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ");
  }

  return "Your account";
}

function getInitials(user) {
  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name;

  if (fullName?.trim()) {
    const words = fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length >= 2) {
      return (
        words[0][0] +
        words[words.length - 1][0]
      ).toUpperCase();
    }

    return fullName
      .trim()
      .slice(0, 2)
      .toUpperCase();
  }

  const email = user?.email;

  if (!email) {
    return "YA";
  }

  const local =
    email.split("@")[0] || "";

  const words = local
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return (
      words[0][0] + words[1][0]
    ).toUpperCase();
  }

  return "YA";
}

/*
 * Small solid gold coin, with an actual coin/currency glyph
 * inside it (lucide-react's Coins) -- it used to be a blank
 * gold circle.
 *
 * It intentionally sits INSIDE the existing
 * .sidebar-option-icon square so it matches
 * the Account icon container.
 */
export function CreditCoinIcon() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "grid",
        placeItems: "center",
        width: "22px",
        height: "22px",
        minWidth: "22px",
        maxWidth: "22px",
        minHeight: "22px",
        maxHeight: "22px",
        flex: "0 0 22px",
        borderRadius: "50%",
        background: "var(--gold)",
        border:
          "1px solid rgba(0, 0, 0, 0.08)",
        boxSizing: "border-box",
        boxShadow:
          "inset 0 -1px 0 rgba(0, 0, 0, 0.12)",
      }}
    >
      <Coins
        size={14}
        strokeWidth={2}
        color="var(--ink)"
      />
    </span>
  );
}

export default function ConversationSidebar({
  conversations = [],
  activeId,
  loading,
  error,
  creating,
  onNewChat,
  onSelect,
  onDelete,
  onPin,
  onUnpin,
  onSignOut,
  user,
  onAccount,
  onCredits,
  credits = 0,
  open,
  onClose,
}) {
  const [profileOpen, setProfileOpen] =
    useState(false);

  // The conversation whose one-tap "x" was clicked and is now waiting on an
  // explicit confirm. Deleting removes the project, its analysis and its
  // conversation history for good, so it never happens on a single click.
  const [confirmDeleteId, setConfirmDeleteId] =
    useState(null);

  // Which row is hovered / keyboard-focused, so its title can slide. Only
  // one row at a time. Kept here (not per row) because rows are rendered in
  // a map.
  const [hoverId, setHoverId] = useState(null);
  const [focusId, setFocusId] = useState(null);

  useEffect(() => {
    if (!confirmDeleteId) return undefined;

    const cancelOnEscape = (event) => {
      if (event.key === "Escape") {
        setConfirmDeleteId(null);
      }
    };

    document.addEventListener(
      "keydown",
      cancelOnEscape
    );

    return () =>
      document.removeEventListener(
        "keydown",
        cancelOnEscape
      );
  }, [confirmDeleteId]);

  // The sidebar-local notice used to show a failed pin -- notably the
  // backend's "You can pin up to 3 projects. Unpin one to pin this."
  // rejection -- and which row's pin request is in flight (so a double click
  // can't send it twice).
  const [notice, setNotice] = useState("");
  const [pinBusyId, setPinBusyId] = useState(null);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(timer);
  }, [notice]);

  // One click pins; when pinned, the same button unpins. Unpin is immediate
  // and has no confirmation: it only clears the pin, it never deletes
  // anything.
  const handleTogglePin = async (conversation) => {
    if (pinBusyId) return;

    setNotice("");
    setPinBusyId(conversation.id);

    try {
      if (isPinned(conversation)) {
        await onUnpin?.(conversation);
      } else {
        await onPin?.(conversation);
      }
    } catch (error) {
      setNotice(pinErrorMessage(error));
    } finally {
      setPinBusyId(null);
    }
  };

  const groups =
    groupConversations(
      conversations
    );

  const displayName =
    getDisplayName(user);

  const initials =
    getInitials(user);

  const email =
    user?.email || "";

  const closeProfile = () => {
    setProfileOpen(false);
  };

  const handleSelect = (
    conversation
  ) => {
    closeProfile();
    onSelect(conversation);
  };

  const handleNewChat = () => {
    closeProfile();
    onNewChat();
  };

  const handleAccount = () => {
    closeProfile();

    if (onAccount) {
      onAccount();
    }
  };

  const handleCredits = () => {
    closeProfile();

    if (onCredits) {
      onCredits();
    }
  };

  const handleSignOut = () => {
    closeProfile();
    onSignOut();
  };

  return (
    <>
      {open && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={`sidebar ${
          open ? "open" : ""
        }`}
      >
        <div className="sidebar-top">
          <button
            className="btn btn-primary sidebar-new"
            type="button"
            onClick={handleNewChat}
            disabled={
              creating || loading
            }
          >
            {creating
              ? "Creating…"
              : "+ New analysis"}
          </button>
        </div>

        <div className="sidebar-scroll">
          {notice && (
            <div className="sidebar-notice" role="alert">
              <span>{notice}</span>

              <button
                type="button"
                className="sidebar-notice-close"
                aria-label="Dismiss"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}

          {loading && (
            <p className="sidebar-status">
              Loading conversations…
            </p>
          )}

          {error && (
            <p className="sidebar-error">
              {error}
            </p>
          )}

          {!loading &&
            !error &&
            conversations.length ===
              0 && (
              <p className="sidebar-status">
                No analyses yet. Start one
                with New analysis.
              </p>
            )}

          {groups.map((group) => (
            <div
              key={group.label}
              className="sidebar-group"
            >
              <div
                className={`sidebar-group-label ${
                  group.key === "pinned"
                    ? "pinned"
                    : ""
                }`}
              >
                {group.key === "pinned" && (
                  <Pin
                    size={12}
                    strokeWidth={2.4}
                    aria-hidden="true"
                  />
                )}

                {group.label}
              </div>

              {group.items.map(
                (conversation) =>
                  confirmDeleteId ===
                  conversation.id ? (
                    <div
                      key={conversation.id}
                      className="sidebar-item-confirm"
                      role="alertdialog"
                      aria-label="Confirm delete"
                    >
                      <p>
                        Delete this project? This
                        removes its data and
                        analysis and can't be
                        undone.
                      </p>

                      <div className="sidebar-item-confirm-actions">
                        <button
                          type="button"
                          className="sidebar-item-confirm-cancel"
                          autoFocus
                          onClick={() =>
                            setConfirmDeleteId(
                              null
                            )
                          }
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          className="sidebar-item-confirm-delete"
                          onClick={() => {
                            setConfirmDeleteId(
                              null
                            );
                            onDelete(
                              conversation
                            );
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                  <div
                    key={conversation.id}
                    className={`sidebar-item ${
                      conversation.id ===
                      activeId
                        ? "active"
                        : ""
                    }`}
                    onMouseEnter={() =>
                      setHoverId(
                        conversation.id
                      )
                    }
                    onMouseLeave={() =>
                      setHoverId(null)
                    }
                  >
                    <button
                      type="button"
                      className="sidebar-item-button"
                      onClick={() =>
                        handleSelect(
                          conversation
                        )
                      }
                      onFocus={(event) => {
                        // Keyboard focus only -- a mouse click also
                        // focuses the button, and that shouldn't set the
                        // title moving.
                        if (
                          event.target.matches?.(
                            ":focus-visible"
                          )
                        ) {
                          setFocusId(
                            conversation.id
                          );
                        }
                      }}
                      onBlur={() =>
                        setFocusId(null)
                      }
                    >
                      <MarqueeTitle
                        text={
                          conversation.title ||
                          "New Analysis"
                        }
                        active={
                          hoverId ===
                            conversation.id ||
                          focusId ===
                            conversation.id
                        }
                      />
                    </button>

                    <button
                      type="button"
                      className={`sidebar-item-pin ${
                        isPinned(conversation)
                          ? "pinned"
                          : ""
                      }`}
                      aria-label={`${
                        isPinned(conversation)
                          ? "Unpin"
                          : "Pin"
                      } ${
                        conversation.title ||
                        "conversation"
                      }`}
                      title={
                        isPinned(conversation)
                          ? "Unpin"
                          : "Pin to top"
                      }
                      disabled={
                        pinBusyId ===
                        conversation.id
                      }
                      onClick={() =>
                        handleTogglePin(
                          conversation
                        )
                      }
                    >
                      {isPinned(conversation) ? (
                        <PinOff
                          size={15}
                          aria-hidden="true"
                        />
                      ) : (
                        <Pin
                          size={15}
                          aria-hidden="true"
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      className="sidebar-item-delete"
                      aria-label={`Delete ${
                        conversation.title ||
                        "conversation"
                      }`}
                      onClick={() => {
                        // The row is about to be replaced by the confirm, so
                        // its mouse-leave will never fire: clear the title's
                        // hover/focus state here or it could linger.
                        setHoverId(null);
                        setFocusId(null);
                        setConfirmDeleteId(
                          conversation.id
                        );
                      }}
                    >
                      ×
                    </button>
                  </div>
                  )
              )}
            </div>
          ))}
        </div>

        <div className="sidebar-account">
          {profileOpen && (
            <div className="sidebar-profile-menu">
              {/* PROFILE HEADER */}
              <div className="sidebar-profile-heading">
                <span className="sidebar-profile-avatar">
                  {initials}
                </span>

                <div className="sidebar-profile-heading-copy">
                  <strong>
                    {displayName}
                  </strong>

                  <span>
                    {email ||
                      "Account details"}
                  </span>
                </div>

                <button
                  type="button"
                  className="sidebar-profile-close"
                  onClick={closeProfile}
                  aria-label="Close account menu"
                >
                  ×
                </button>
              </div>

              <div className="sidebar-profile-divider" />

              {/* ACCOUNT */}
              <button
                type="button"
                className="sidebar-profile-option"
                onClick={handleAccount}
              >
                <span className="sidebar-option-icon">
                  <Settings
                    size={14}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </span>

                <span className="sidebar-option-copy">
                  <strong>
                    Account
                  </strong>

                  <small>
                    Profile settings
                  </small>
                </span>

                <span className="sidebar-option-arrow">
                  ›
                </span>
              </button>

              {/* CREDITS */}
              <button
                type="button"
                className="sidebar-profile-option"
                onClick={handleCredits}
              >
                <span className="sidebar-option-icon">
                  <CreditCoinIcon />
                </span>

                <span className="sidebar-option-copy">
                  <strong>
                    Credits
                  </strong>

                  <small>
                    {Number(
                      credits || 0
                    ).toLocaleString()}{" "}
                    credits available
                  </small>
                </span>

                <span className="sidebar-option-arrow">
                  ›
                </span>
              </button>

              <div className="sidebar-profile-divider" />

              {/* SIGN OUT */}
              <button
                type="button"
                className="sidebar-profile-option logout"
                onClick={handleSignOut}
              >
                <span className="sidebar-option-icon">
                  <LogOut
                    size={14}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </span>

                <span className="sidebar-option-copy">
                  <strong>
                    Sign out
                  </strong>

                  <small>
                    End this session
                  </small>
                </span>

                <span className="sidebar-option-arrow">
                  ›
                </span>
              </button>
            </div>
          )}

          {/* PROFILE TRIGGER */}
          <button
            type="button"
            className={`sidebar-profile-trigger ${
              profileOpen ? "open" : ""
            }`}
            onClick={() =>
              setProfileOpen(
                (value) => !value
              )
            }
            aria-expanded={profileOpen}
            aria-label="Open account menu"
          >
            <span className="sidebar-profile-avatar">
              {initials}
            </span>

            <span className="sidebar-profile-info">
              <strong>
                {displayName}
              </strong>

              <span>
                {Number(
                  credits || 0
                ).toLocaleString()}{" "}
                credits
              </span>
            </span>

            <span className="sidebar-profile-arrow">
              ›
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}