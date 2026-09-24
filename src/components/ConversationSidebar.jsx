import { useEffect, useState } from "react";
import {
  Coins,
  Ellipsis,
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

  // Which conversation's "..." menu is open (one at a time), and the
  // sidebar-local notice used to show a failed pin -- notably the backend's
  // "You can pin up to 3 projects. Unpin one to pin this." rejection.
  const [menuId, setMenuId] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!menuId) return undefined;

    const closeOnOutside = (event) => {
      if (!event.target.closest?.("[data-pin-menu]")) {
        setMenuId(null);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuId(null);
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("touchstart", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Unpin is immediate and has no confirmation: it only clears the pin, it
  // never deletes anything.
  const handleTogglePin = async (conversation) => {
    setMenuId(null);
    setNotice("");

    try {
      if (isPinned(conversation)) {
        await onUnpin?.(conversation);
      } else {
        await onPin?.(conversation);
      }
    } catch (error) {
      setNotice(pinErrorMessage(error));
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
                (conversation) => (
                  <div
                    key={conversation.id}
                    className={`sidebar-item ${
                      conversation.id ===
                      activeId
                        ? "active"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="sidebar-item-button"
                      onClick={() =>
                        handleSelect(
                          conversation
                        )
                      }
                    >
                      {conversation.title ||
                        "New Analysis"}
                    </button>

                    <div
                      className="sidebar-item-menu"
                      data-pin-menu
                    >
                      <button
                        type="button"
                        className="sidebar-item-more"
                        aria-label={`Options for ${
                          conversation.title ||
                          "conversation"
                        }`}
                        aria-haspopup="menu"
                        aria-expanded={
                          menuId ===
                          conversation.id
                        }
                        onClick={() =>
                          setMenuId((id) =>
                            id ===
                            conversation.id
                              ? null
                              : conversation.id
                          )
                        }
                      >
                        <Ellipsis
                          size={16}
                          aria-hidden="true"
                        />
                      </button>

                      {menuId ===
                        conversation.id && (
                        <div
                          className="sidebar-item-popover"
                          role="menu"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="sidebar-item-popover-option"
                            onClick={() =>
                              handleTogglePin(
                                conversation
                              )
                            }
                          >
                            {isPinned(
                              conversation
                            ) ? (
                              <PinOff
                                size={14}
                                aria-hidden="true"
                              />
                            ) : (
                              <Pin
                                size={14}
                                aria-hidden="true"
                              />
                            )}

                            {isPinned(conversation)
                              ? "Unpin"
                              : "Pin to top"}
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="sidebar-item-delete"
                      aria-label={`Delete ${
                        conversation.title ||
                        "conversation"
                      }`}
                      onClick={() =>
                        onDelete(
                          conversation
                        )
                      }
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