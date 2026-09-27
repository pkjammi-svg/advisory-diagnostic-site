// Turn low-level auth errors into messages a client can act on.
export function friendlyAuthError(error) {
  const msg = error?.message || String(error || "");
  if (/failed to fetch|networkerror|load failed|fetch failed|supabaseUrl is required|invalid url/i.test(msg)) {
    console.error("Auth service unreachable:", msg);
    return "We couldn't reach our sign-in service. Please check your connection and try again in a few minutes. If this keeps happening, please contact us.";
  }
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match. Please try again or reset your password.";
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first — check your inbox for the confirmation link.";
  if (/user already registered/i.test(msg)) return "An account with this email already exists. Please sign in instead.";
  return msg || "Something went wrong. Please try again.";
}
