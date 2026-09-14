import { useState } from "react";
import { useAuth } from "../AuthContext.jsx";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState("signin");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isSignup = mode === "signup";

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (isSignup && !cleanName) {
      setError("Enter your full name.");
      return;
    }

    if (!cleanEmail || !password) {
      setError("Enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Your password must be at least 6 characters."
      );
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
          setMessage(
            "Account created. Check your email to confirm your account, then sign in."
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
    setMode(isSignup ? "signin" : "signup");
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