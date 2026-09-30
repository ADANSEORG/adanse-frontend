// What the app can know about the signed-in user the moment it loads, before
// any network request -- so it doesn't sit on a "Checking your session…"
// screen while Supabase's auth server is asked. Kept free of window/import.meta
// so it runs under plain node:test; AuthContext.jsx passes the browser's values.
//
// Supabase keeps the session in localStorage under `storageKey`. If one is
// there, the app shows straight away and AuthContext confirms it in the
// background (an invalid one then signs the person out, as before). If none is
// there, the sign-in screen shows straight away. Only a return from Google
// sign-in or a password-reset/confirmation link still waits, because that
// session is in the URL and Supabase has to process it first.

export function storedSessionUser(storage, storageKey) {
  if (!storage || !storageKey) return null;

  let session;
  try {
    const raw = storage.getItem(storageKey);
    session = raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }

  const user = session?.user;
  if (
    !session ||
    typeof session.refresh_token !== "string" ||
    !session.refresh_token ||
    !user ||
    typeof user.id !== "string" ||
    !user.id
  ) {
    return null;
  }
  return user;
}

const AUTH_RETURN_PARAMS = [
  "access_token",
  "refresh_token",
  "code",
  "token_hash",
  "error",
  "error_description",
];

// The URL carries something Supabase must process first: an OAuth or magic
// link session (implicit flow: in the hash; PKCE: ?code=), a password-reset or
// email-confirmation link, or an OAuth error.
export function urlHasAuthReturn(search, hash) {
  return [search, hash].some((part) => {
    const params = new URLSearchParams(String(part || "").replace(/^[?#]/, ""));
    return AUTH_RETURN_PARAMS.some((name) => params.has(name)) || params.get("type") === "recovery";
  });
}

export function initialAuthState({ storedUser, authReturn }) {
  if (authReturn) return { user: null, loading: true };
  return { user: storedUser || null, loading: false };
}

// A failed background check only signs the person out when the auth server
// actually rejected the session -- not when the request never got through
// (offline, a dropped connection), which would sign them out for nothing.
export function isNetworkAuthFailure(error) {
  return (
    error?.name === "AuthRetryableFetchError" ||
    error?.status === 0 ||
    error instanceof TypeError ||
    /failed to fetch|load failed|networkerror/i.test(String(error?.message || ""))
  );
}
