import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

          if (active) {
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

        if (active) {
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