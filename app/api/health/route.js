import { getSupabaseServerClient } from "../../../lib/supabaseClient";

export const dynamic = "force-dynamic";

// Setup diagnostics: reports whether configuration is present and whether
// Supabase is reachable. Never returns key values.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const checks = {
    NEXT_PUBLIC_SUPABASE_URL: url ? "set" : "MISSING",
    supabase_host: safeHost(url),
    url_looks_right: /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url.trim()) ? "yes" : "NO — should look like https://xxxx.supabase.co",
    url_has_extra_spaces_or_quotes: url !== url.trim() || /["']/.test(url) ? "YES — remove them" : "no",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon ? `set (${anon.length} chars)` : "MISSING",
    SUPABASE_URL: process.env.SUPABASE_URL ? "set" : "MISSING",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING",
    ADMIN_EMAILS: process.env.ADMIN_EMAILS ? "set" : "MISSING",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? "set" : "not set (optional)"
  };

  if (url) {
    try {
      const res = await fetch(`${url.trim().replace(/\/$/, "")}/auth/v1/health`, {
        headers: { apikey: anon.trim() },
        cache: "no-store",
        signal: AbortSignal.timeout(8000)
      });
      checks.supabase_auth_reachable = res.ok ? "yes" : `responded with HTTP ${res.status}${res.status === 401 ? " (anon key wrong?)" : ""}`;
    } catch (err) {
      checks.supabase_auth_reachable = `NO — ${err.message} (project paused, deleted, or URL wrong)`;
    }
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { error } = await getSupabaseServerClient().from("engagements").select("id", { head: true, count: "exact" });
      checks.portal_tables = error ? `NOT READY — ${error.message} (run supabase/schema.sql)` : "ready";
    } catch (err) {
      checks.portal_tables = `NOT READY — ${err.message}`;
    }
  }

  return Response.json(checks, { headers: { "Cache-Control": "no-store" } });
}

function safeHost(url) {
  try {
    return new URL(url.trim()).host;
  } catch {
    return url ? "not a valid URL" : "";
  }
}
