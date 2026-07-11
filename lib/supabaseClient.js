import { createClient } from "@supabase/supabase-js";

// Server-side only client - uses the service role key, never expose this in browser code.
export function getSupabaseServerClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
