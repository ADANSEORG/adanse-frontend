import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";

const RESEND_COOLDOWN_SECONDS = 45;

// Supabase intentionally returns the same error code/message for a
// wrong code and an expired one (anti-enumeration), so we can't show
// distinct copy for those two cases.
function describeOtpError(err) {
  switch (err?.code) {
    case "otp_expired":
      return "That code is incorrect or has expired. Check the latest code we emailed you, or request a new one.";
    case "over_email_send_rate_limit":
      return "You're requesting codes too quickly. Wait a minute before asking for another one.";
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return (
        err?.message ||
        "We couldn't verify that code. Please try again."
      );
  }
}

/*
 * Same validation rules for both modes, just applied
 * differently: signup requires a name, both modes require
 * email + password, and the password length rule always
 * applies (Supabase itself enforces at least 6 characters).
 */
function validateAuthForm({ isSignup, name, email, password }) {
  if (isSignup && !name) {
    return "Enter your full name.";
  }

  if (!email || !password) {
    return "Enter your email and password.";
  }

  if (password.length < 6) {
    return "Your password must be at least 6 characters.";
  }

  return null;
}

export default function AuthScreen() {
  const {
    signIn,
    signUp,
    verifySignupOtp,
    resendSignupOtp,
  } = useAuth();

  const [mode, setMode] = useState("signin");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Set once signUp succeeds without a session, meaning the
  // account needs email confirmation before it can sign in.
  const [pendingEmail, setPendingEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const isSignup = mode === "signup";
  const isVerifying = Boolean(pendingEmail);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;

    const timer = setInterval(() => {
      setResendCooldown((seconds) =>
        seconds > 0 ? seconds - 1 : 0
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    const validationError = validateAuthForm({
      isSignup,
      name: cleanName,
      email: cleanEmail,
      password,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      if (isSignup) {
        const data = await signUp({
          name: cleanName,
          email: cleanEmail,
          password,
        });

        if (data?.session) {
          setMessage(
            "Account created. Welcome to Adanse."
          );
        } else {
          setPendingEmail(cleanEmail);
          setResendCooldown(
            RESEND_COOLDOWN_SECONDS
          );
        }
      } else {
        await signIn({
          email: cleanEmail,
          password,
        });
      }
    } catch (err) {
      setError(
        err?.message ||
          "We couldn't complete that request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setError("");
    setMessage("");
    setPendingEmail("");
    setCode("");
    setMode(isSignup ? "signin" : "signup");
  }

  async function handleVerifyCode(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanCode = code.trim();

    if (!cleanCode) {
      setError("Enter the confirmation code we emailed you.");
      return;
    }

    setVerifying(true);

    try {
      await verifySignupOtp({
        email: pendingEmail,
        token: cleanCode,
      });
      // On success, AuthContext's session listener routes us
      // into the app the same way a normal sign-in does.
    } catch (err) {
      setError(describeOtpError(err));
    } finally {
      setVerifying(false);
    }
  }

  async function handleResendCode() {
    setError("");
    setMessage("");
    setResending(true);

    try {
      await resendSignupOtp({ email: pendingEmail });
      setMessage("We sent you a new code.");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(describeOtpError(err));
    } finally {
      setResending(false);
    }
  }

  function handleBackToSignup() {
    setError("");
    setMessage("");
    setPendingEmail("");
    setCode("");
  }

  return (
    <main className="auth-page">
      <div className="auth-container">

        <header className="auth-header">
          <div className="auth-brand">
            Adanse
          </div>

          <div className="auth-tagline">
            thesis data analysis
          </div>
        </header>

        <section className="auth-layout">

          <div className="auth-intro">
            <div className="auth-eyebrow">
              THESIS DATA ANALYSIS
            </div>

            <h1>
              Turn your data into
              <br />
              a thesis you can explain.
            </h1>

            <p className="auth-description">
              Upload your dataset, ask your research
              question, and let Adanse guide you
              toward an appropriate statistical
              analysis.
            </p>

            <div className="auth-features">

              <div className="auth-feature">
                <span className="auth-feature-number">
                  01
                </span>

                <div>
                  <strong>
                    Ask naturally
                  </strong>

                  <p>
                    Describe what you want to
                    understand.
                  </p>
                </div>
              </div>

              <div className="auth-feature">
                <span className="auth-feature-number">
                  02
                </span>

                <div>
                  <strong>
                    Analyse with confidence
                  </strong>

                  <p>
                    Get a statistically appropriate
                    path.
                  </p>
                </div>
              </div>

              <div className="auth-feature">
                <span className="auth-feature-number">
                  03
                </span>

                <div>
                  <strong>
                    Understand the result
                  </strong>

                  <p>
                    See what the numbers actually
                    mean.
                  </p>
                </div>
              </div>

            </div>
          </div>

          <div className="auth-card">

            {isVerifying ? (
              <>
                <div className="auth-card-top">
                  Confirm your email
                </div>

                <div className="auth-card-heading">
                  <h2>Enter your code</h2>

                  <p>
                    We sent a confirmation code to{" "}
                    <strong>{pendingEmail}</strong>.
                    Enter it below to finish creating
                    your account.
                  </p>
                </div>

                <form
                  className="auth-form"
                  onSubmit={handleVerifyCode}
                >
                  <label
                    className="auth-label"
                    htmlFor="auth-otp"
                  >
                    Confirmation code
                  </label>

                  <input
                    id="auth-otp"
                    className="auth-input auth-otp-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={12}
                    value={code}
                    onChange={(e) =>
                      setCode(
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                    placeholder="Enter the code from your email"
                    disabled={verifying}
                  />

                  {error && (
                    <div
                      className="auth-error"
                      role="alert"
                    >
                      {error}
                    </div>
                  )}

                  {message && (
                    <div
                      className="auth-message"
                      role="status"
                    >
                      {message}
                    </div>
                  )}

                  <button
                    className="auth-submit"
                    type="submit"
                    disabled={verifying}
                  >
                    {verifying
                      ? "Verifying…"
                      : "Verify and continue"}
                  </button>
                </form>

                <div className="auth-switch">
                  <span>Didn't get the email?</span>

                  <button
                    type="button"
                    className="auth-switch-button"
                    onClick={handleResendCode}
                    disabled={
                      resending || resendCooldown > 0
                    }
                  >
                    {resending
                      ? "Sending…"
                      : resendCooldown > 0
                        ? `Resend code (${resendCooldown}s)`
                        : "Resend code"}
                  </button>
                </div>

                <div className="auth-switch">
                  <button
                    type="button"
                    className="auth-switch-button"
                    onClick={handleBackToSignup}
                  >
                    Use a different email
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="auth-card-top">
                  {isSignup
                    ? "Get started"
                    : "Welcome back"}
                </div>

                <div className="auth-card-heading">
                  <h2>
                    {isSignup
                      ? "Create your account"
                      : "Sign in to Adanse"}
                  </h2>

                  <p>
                    {isSignup
                      ? "Start analysing your research data."
                      : "Continue where you left off with your research."}
                  </p>
                </div>

                <form
                  className="auth-form"
                  onSubmit={handleSubmit}
                >

              {isSignup && (
                <>
                  <label
                    className="auth-label"
                    htmlFor="auth-name"
                  >
                    Full name
                  </label>

                  <input
                    id="auth-name"
                    className="auth-input"
                    type="text"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    placeholder="Your full name"
                    autoComplete="name"
                    disabled={loading}
                  />
                </>
              )}

              <label
                className="auth-label"
                htmlFor="auth-email"
              >
                Email address
              </label>

              <input
                id="auth-email"
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />

              <label
                className="auth-label"
                htmlFor="auth-password"
              >
                Password
              </label>

              <input
                id="auth-password"
                className="auth-input"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder={
                  isSignup
                    ? "At least 6 characters"
                    : "Your password"
                }
                autoComplete={
                  isSignup
                    ? "new-password"
                    : "current-password"
                }
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

              {message && (
                <div
                  className="auth-message"
                  role="status"
                >
                  {message}
                </div>
              )}

              <button
                className="auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? isSignup
                    ? "Creating account…"
                    : "Signing in…"
                  : isSignup
                    ? "Create account"
                    : "Sign in"}
              </button>

                </form>

                <div className="auth-switch">
                  <span>
                    {isSignup
                      ? "Already have an account?"
                      : "Don't have an account?"}
                  </span>

                  <button
                    type="button"
                    className="auth-switch-button"
                    onClick={switchMode}
                    disabled={loading}
                  >
                    {isSignup
                      ? "Sign in"
                      : "Create one"}
                  </button>
                </div>

                <p className="auth-disclaimer">
                  Your research is associated with your
                  account.
                </p>
              </>
            )}

          </div>

        </section>

        <footer className="auth-footer">
          <span>Adanse</span>
          <span>
            Research, made clearer.
          </span>
        </footer>

      </div>
    </main>
  );
}