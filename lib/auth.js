import { createSupabaseServerClient } from "./supabase/server";
import { getSupabaseServerClient } from "./supabaseClient";

// Consultant/admin accounts are listed in the ADMIN_EMAILS env var (comma separated).
export function isAdminEmail(email) {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export async function getCurrentUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    if (!user) return null;
    return { ...user, isAdmin: isAdminEmail(user.email) };
  } catch {
    return null;
  }
}

// All portal data access goes through the service-role client on the server,
// after an explicit ownership / admin check. Clients never query tables directly.
export function db() {
  return getSupabaseServerClient();
}

// Columns a client is allowed to see on their own engagement.
export const CLIENT_ENGAGEMENT_COLUMNS =
  "id, user_id, service, status, company_name, client_name, client_email, inputs, requests, request_note, solution, solution_published_at, submitted_at, created_at, updated_at";

// Returns the engagement if the user owns it (or is an admin), otherwise null.
export async function loadEngagementFor(user, id, { admin = false } = {}) {
  if (!user || !id) return null;
  const columns = admin && user.isAdmin ? "*" : CLIENT_ENGAGEMENT_COLUMNS;
  const { data, error } = await db().from("engagements").select(columns).eq("id", id).maybeSingle();
  if (error || !data) return null;
  if (data.user_id !== user.id && !user.isAdmin) return null;
  // Clients only see the solution once it has been published.
  if (!(admin && user.isAdmin) && !data.solution_published_at) data.solution = null;
  return data;
}

export async function loadFiles(engagementId) {
  const { data } = await db()
    .from("engagement_files")
    .select("id, engagement_id, doc_type, file_name, size_bytes, uploaded_by_admin, created_at")
    .eq("engagement_id", engagementId)
    .order("created_at", { ascending: true });
  return data || [];
}

export function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}
