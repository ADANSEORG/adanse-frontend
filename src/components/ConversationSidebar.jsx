import { useState } from "react";

function startOfLocalDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
}

function groupConversations(conversations) {
  const today = startOfLocalDay(new Date());

  const yesterday =
    today - 24 * 60 * 60 * 1000;

  const groups = [
    {
      label: "Today",
      items: [],
    },
    {
      label: "Yesterday",
      items: [],
    },
    {
      label: "Older",
      items: [],
    },
  ];

  for (const conversation of conversations) {
    const stamp = startOfLocalDay(
      new Date(
        conversation.updated_at ||
          conversation.created_at
      )
    );

    if (stamp === today) {
      groups[0].items.push(conversation);
    } else if (stamp === yesterday) {
      groups[1].items.push(conversation);
    } else {
      groups[2].items.push(conversation);
    }
  }

  return groups.filter(
    (group) => group.items.length > 0
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
 * Small solid gold coin.
 *
 * It intentionally sits INSIDE the existing
 * .sidebar-option-icon square so it matches
 * the Account icon container.
 *
 * No sparkle.
 * No star.
 * No AI icon.
 */
function CreditCoinIcon() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "block",
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
    />
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
              <div className="sidebar-group-label">
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
                  ◉
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
                  ↪
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