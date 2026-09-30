import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "./supabaseClient";
import { resolveSiteUrl } from "./siteUrl";
import { oauthRedirectUrl } from "./oauth";
import {
  initialAuthState,
  isNetworkAuthFailure,
  storedSessionUser,
  urlHasAuthReturn,
} from "./sessionBootstrap";

// Read once, synchronously, before the first render: see sessionBootstrap.js.
function bootAuthState() {
  if (!supabase || typeof window === "undefined") {
    return { user: null, loading: Boolean(supabase) };
  }
  let storage = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  return initialAuthState({
    storedUser: storedSessionUser(storage, supabase.storageKey),
    authReturn: urlHasAuthReturn(window.location.search, window.location.hash),
  });
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [boot] = useState(bootAuthState);
  const [user, setUser] = useState(boot.user);
  const [loading, setLoading] = useState(boot.loading);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    async function loadUser() {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error(
            "Failed to load authenticated user:",
            error
          );

          // Keep whoever is shown signed in when the check simply didn't get
          // through; only a session the server rejected signs them out.
          if (active && !isNetworkAuthFailure(error)) {
            setUser(null);
          }

          return;
        }

        if (active) {
          setUser(data.user ?? null);
        }
      } catch (error) {
        console.error(
          "Unexpected authentication error:",
          error
        );

        if (active && !isNetworkAuthFailure(error)) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUser();

    const {
      data: {
        subscription,
      },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;

        setUser(
          session?.user ?? null
        );

        setLoading(false);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn({
    email,
    password,
  }) {
    if (!supabase) {
      throw new Error(
        "Supabase is not configured."
      );
    }

    const {
      data,
      error,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    setUser(data.user ?? null);

    return data;
  }

  async function signUp({
    name,
    email,
    password,
  }) {
    if (!supabase) {
      throw new Error(
        "Supabase is not configured."
      );
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      throw new Error(
        "Your full name is required."
      );
    }

    const {
      data,
      error,
    } = await supabase.auth.signUp({
      email: cleanEmail,
      password,

      options: {
        data: {
          full_name: cleanName,
          // Stamped once at account creation so the welcome modal can
          // tell a brand-new signup apart from any later sign-in, on
          // any device -- absent/false for every account created
          // before this existed, so it never resurfaces for them.
          needs_welcome: true,
        },
      },
    });

    if (error) {
      throw error;
    }

    // Only set the user here if signUp already returned a
    // session (e.g. confirmations disabled). When email
    // confirmation is required, data.session is null and the
    // user must verify the OTP before we have a session.
    if (data?.session) {
      setUser(data.user ?? null);
    }

    return data;
  }

  async function verifySignupOtp({
    email,
    token,
  }) {
    if (!supabase) {
      throw new Error(
        "Supabase is not configured."
      );
    }

    const {
      data,
      error,
    } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (error) {
      throw error;
    }

    setUser(data.user ?? null);

    return data;
  }

  async function resendSignupOtp({
    email,
  }) {
    if (!supabase) {
      throw new Error(
        "Supabase is not configured."
      );
    }

    const {
      error,
    } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      throw error;
    }
  }

  // Google sign-in. Supabase sends the browser to Google and back to the site
  // root, where the client (default implicit flow) picks the session up from
  // the URL and onAuthStateChange above sets the user. The same call signs a
  // new person up. A Google login with the email of an existing (confirmed)
  // account is linked to that account by Supabase, so it keeps its credits.
  async function signInWithGoogle() {
    if (!supabase) {
      throw new Error(
        "Supabase is not configured."
      );
    }

    const {
      error,
    } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: oauthRedirectUrl(
          import.meta.env.VITE_SITE_URL,
          window.location.origin
        ),
      },
    });

    if (error) {
      throw error;
    }
  }

  async function resetPasswordForEmail(email) {
    if (!supabase) {
      throw new Error(
        "Supabase is not configured."
      );
    }

    const {
      error,
    } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        // VITE_SITE_URL lets each environment (production, a Vercel
        // preview, local dev) point the reset email back at itself
        // instead of always landing on production; falls back to the
        // browser's own origin when unset, so previews/local dev work
        // with zero extra configuration.
        redirectTo:
          `${resolveSiteUrl(import.meta.env.VITE_SITE_URL, window.location.origin)}/reset-password`,
      }
    );

    if (error) {
      throw error;
    }
  }

  async function updatePassword(password) {
    if (!supabase) {
      throw new Error(
        "Supabase is not configured."
      );
    }

    const {
      data,
      error,
    } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw error;
    }

    setUser(data.user ?? null);

    return data;
  }

  async function markWelcomeSeen() {
    if (!supabase) {
      return;
    }

    const {
      data,
      error,
    } = await supabase.auth.updateUser({
      data: {
        needs_welcome: false,
      },
    });

    if (error) {
      throw error;
    }

    setUser(data.user ?? null);
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    const {
      error,
    } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        verifySignupOtp,
        resendSignupOtp,
        resetPasswordForEmail,
        signInWithGoogle,
        updatePassword,
        markWelcomeSeen,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () =>
  useContext(AuthContext);