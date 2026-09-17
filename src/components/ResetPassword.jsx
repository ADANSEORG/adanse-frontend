import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import ParticleField from "./ParticleField.jsx";
import { validateNewPassword } from "../passwordValidation.js";

/*
 * ---------------------------------------------------------
 * ResetPassword
 * ---------------------------------------------------------
 *
 * Reached from the link in a password-reset email. Supabase only
 * ever redirects here after establishing a short-lived recovery
 * session, so the same check App.jsx uses to decide whether to
 * show AuthScreen ("is there a signed-in user", from AuthContext)
 * doubles as "is this a valid, unexpired reset link" here. A
 * directly-typed URL or an expired/already-used link both simply
 * mean AuthContext resolves with no user, which renders as the
 * invalid-link state below instead of a broken form.
 */
export default function ResetPassword() {
  const {
    user,
    loading: authLoading,
    updatePassword,
    signOut,
  } = useAuth();

  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    const validationError = validateNewPassword(
      password,
      confirmPassword
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);

      // The recovery link leaves the visitor signed in under a
      // short-lived session -- sign that out so they land on a
      // normal sign-in screen and confirm the new password works.
      await signOut();

      navigate("/", {
        replace: true,
        state: {
          authMessage:
            "Your password has been reset. Sign in with your new password.",
        },
      });
    } catch (err) {
      setError(
        err?.message ||
          "We couldn't update your password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <ParticleField />

      <div className="auth-container">
        <header className="auth-header">
          <Link to="/" className="auth-brand">
            Adanse
          </Link>

          <div className="auth-tagline">
            thesis data analysis
          </div>
        </header>

        <div className="auth-standalone">
          <div className="auth-card">
            {authLoading ? (
              <div className="upload-progress">
                <div
                  className="upload-progress-spinner"
                  aria-hidden="true"
                />

                <div className="upload-progress-text">
                  Checking your reset link…
                </div>
              </div>
            ) : !user ? (
              <>
                <div className="auth-card-top">
                  Reset password
                </div>

                <div className="auth-card-heading">
                  <h2>
                    This link is invalid or has expired.
                  </h2>

                  <p>
                    Password reset links only work once
                    and expire after a short time. Request
                    a new one from the sign-in screen.
                  </p>
                </div>

                <Link to="/" className="btn btn-primary">
                  Back to sign in
                </Link>
              </>
            ) : (
              <>
                <div className="auth-card-top">
                  Reset password
                </div>

                <div className="auth-card-heading">
                  <h2>Choose a new password</h2>

                  <p>
                    Enter and confirm a new password for
                    your account.
                  </p>
                </div>

                <form
                  className="auth-form"
                  onSubmit={handleSubmit}
                >
                  <label
                    className="auth-label"
                    htmlFor="reset-password"
                  >
                    New password
                  </label>

                  <input
                    id="reset-password"
                    className="auth-input"
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <label
                    className="auth-label"
                    htmlFor="reset-confirm-password"
                  >
                    Confirm new password
                  </label>

                  <input
                    id="reset-confirm-password"
                    className="auth-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  {error && (
                    <div
                      className="auth-error"
                      role="alert"
                    >
                      {error}
                    </div>
                  )}

                  <button
                    className="auth-submit"
                    type="submit"
                    disabled={loading}
                  >
                    {loading
                      ? "Updating…"
                      : "Update password"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
