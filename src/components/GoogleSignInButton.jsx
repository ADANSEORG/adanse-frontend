import { useEffect, useRef } from "react";
import { supabase } from "../supabaseClient"; // match your export style

export default function GoogleSignInButton({ onError, onStart }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    let timer;

    const init = () => {
      if (!window.google || !wrapRef.current) return false;

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          onStart?.();
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.credential,
          });
          if (error) {
            onError?.("We couldn't sign you in with Google. Please try again.");
            console.error("Google sign-in failed:", error.message);
          }
          // On success, AuthContext's session listener routes you in.
        },
      });

      const width = Math.min(
        400,
        Math.max(200, wrapRef.current.offsetWidth || 320)
      );

      window.google.accounts.id.renderButton(wrapRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width,
      });
      return true;
    };

    if (!init()) {
      timer = setInterval(() => {
        if (init()) clearInterval(timer);
      }, 100);
    }
    return () => clearInterval(timer);
  }, [onError, onStart]);

  return <div ref={wrapRef} className="auth-google-wrap" />;
}