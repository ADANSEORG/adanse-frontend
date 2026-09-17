import { useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { validateNewPassword } from "../passwordValidation.js";

export default function Account({
  user,
  onBack,
  onSignOut,
}) {
  const { updatePassword } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    setPasswordError("");
    setPasswordMessage("");

    const validationError = validateNewPassword(
      newPassword,
      confirmPassword
    );

    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setPasswordLoading(true);

    try {
      await updatePassword(newPassword);
      setPasswordMessage("Your password has been updated.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err?.message ||
          "We couldn't update your password. Please try again."
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "Your account";

  const email = user?.email || "";

  const getInitials = () => {
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
      .slice(0, 2)
      .toUpperCase();
  };

  const initials = getInitials();

  const createdAt = user?.created_at
    ? new Date(user.created_at)
    : null;

  const memberSince = createdAt
    ? createdAt.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  return (
    <section style={styles.page}>
      {/* TOP BAR */}
      <div style={styles.topbar}>
        <button
          type="button"
          className="flow-back"
          onClick={onBack}
        >
          <span>←</span>
          <span>Back</span>
        </button>
      </div>

      {/* INTRO */}
      <div style={styles.intro}>
        <div className="section-kicker">
          ACCOUNT
        </div>

        <h1 style={styles.title}>
          Your account.
        </h1>

        <p style={styles.lead}>
          Manage your Adanse account and view
          your account details.
        </p>
      </div>

      {/* ACCOUNT CARD */}
      <div style={styles.profileCard}>
        <div style={styles.profileTop}>
          <div style={styles.avatar}>
            {initials}
          </div>

          <div style={styles.profileIdentity}>
            <h2 style={styles.name}>
              {fullName}
            </h2>

            <p style={styles.email}>
              {email}
            </p>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>
              FULL NAME
            </span>

            <strong style={styles.infoValue}>
              {fullName}
            </strong>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>
              EMAIL
            </span>

            <strong style={styles.infoValue}>
              {email}
            </strong>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>
              MEMBER SINCE
            </span>

            <strong style={styles.infoValue}>
              {memberSince}
            </strong>
          </div>

          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>
              ACCOUNT STATUS
            </span>

            <strong
              style={{
                ...styles.infoValue,
                color: "var(--green)",
              }}
            >
              Active
            </strong>
          </div>
        </div>
      </div>

      {/* SECURITY */}
      <div style={styles.section}>
        <div className="section-kicker">
          SECURITY
        </div>

        <div style={styles.passwordCard}>
          <strong style={styles.settingTitle}>
            Change password
          </strong>

          <p style={styles.settingDescription}>
            Choose a new password for your account.
          </p>

          <form
            className="auth-form"
            style={styles.passwordForm}
            onSubmit={handlePasswordSubmit}
          >
            <label
              className="auth-label"
              htmlFor="account-new-password"
            >
              New password
            </label>

            <input
              id="account-new-password"
              className="auth-input"
              type="password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
              placeholder="At least 6 characters"
              autoComplete="new-password"
              disabled={passwordLoading}
            />

            <label
              className="auth-label"
              htmlFor="account-confirm-password"
            >
              Confirm new password
            </label>

            <input
              id="account-confirm-password"
              className="auth-input"
              type="password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              disabled={passwordLoading}
            />

            {passwordError && (
              <div
                className="auth-error"
                role="alert"
              >
                {passwordError}
              </div>
            )}

            {passwordMessage && (
              <div
                className="auth-message"
                role="status"
              >
                {passwordMessage}
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={passwordLoading}
              style={styles.passwordSubmit}
            >
              {passwordLoading
                ? "Updating…"
                : "Update password"}
            </button>
          </form>
        </div>
      </div>

      {/* SESSION */}
      <div style={styles.section}>
        <div className="section-kicker">
          SESSION
        </div>

        <div style={styles.dangerCard}>
          <div>
            <strong style={styles.settingTitle}>
              Sign out
            </strong>

            <p style={styles.settingDescription}>
              Sign out of your Adanse account on
              this device.
            </p>
          </div>

          <button
            type="button"
            className="btn"
            onClick={onSignOut}
            style={styles.signOutButton}
          >
            Sign out
          </button>
        </div>
      </div>
    </section>
  );
}

const styles = {
  page: {
    maxWidth: "900px",
    margin: "0 auto",
    paddingBottom: "80px",
  },

  topbar: {
    marginBottom: "35px",
  },

  intro: {
    marginBottom: "35px",
  },

  title: {
    font: "600 clamp(40px, 5vw, 58px) / 1.02 var(--display)",
    letterSpacing: "-0.055em",
    margin: "0 0 14px",
  },

  lead: {
    margin: 0,
    color: "var(--muted)",
    fontSize: "17px",
    lineHeight: 1.65,
    maxWidth: "650px",
  },

  profileCard: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "20px",
    padding: "30px",
    boxShadow: "var(--shadow)",
  },

  profileTop: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },

  avatar: {
    width: "64px",
    height: "64px",
    flex: "0 0 64px",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "var(--gold)",
    color: "var(--ink)",
    fontSize: "18px",
    fontWeight: 800,
  },

  profileIdentity: {
    minWidth: 0,
  },

  name: {
    margin: 0,
    font: "600 25px var(--display)",
    letterSpacing: "-0.03em",
  },

  email: {
    margin: "5px 0 0",
    color: "var(--muted)",
    fontSize: "14px",
  },

  divider: {
    height: "1px",
    background: "var(--line)",
    margin: "28px 0",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "25px",
  },

  infoItem: {
    minWidth: 0,
  },

  infoLabel: {
    display: "block",
    color: "var(--muted)",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    marginBottom: "7px",
  },

  infoValue: {
    display: "block",
    fontSize: "14px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  section: {
    marginTop: "42px",
  },

  settingTitle: {
    display: "block",
    fontSize: "15px",
    marginBottom: "5px",
  },

  settingDescription: {
    margin: 0,
    color: "var(--muted)",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  dangerCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "25px",
    padding: "22px",
    background: "var(--surface)",
    border: "1px solid #ead5cf",
    borderRadius: "16px",
  },

  signOutButton: {
    color: "var(--red)",
    borderColor: "#e8c8c1",
    flexShrink: 0,
  },

  passwordCard: {
    padding: "22px",
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "16px",
  },

  passwordForm: {
    maxWidth: "380px",
    marginTop: "18px",
  },

  passwordSubmit: {
    width: "auto",
    padding: "11px 24px",
  },
};