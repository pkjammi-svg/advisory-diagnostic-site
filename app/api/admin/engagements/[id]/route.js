import { STATUSES } from "../../../../../lib/services";
import { db, getCurrentUser, jsonError, loadEngagementFor } from "../../../../../lib/auth";
import { notify } from "../../../../../lib/notify";

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return jsonError("Admins only", 403);
  const eng = await loadEngagementFor(user, params.id, { admin: true });
  if (!eng) return jsonError("Not found", 404);

  const body = await req.json().catch(() => ({}));
  const update = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    if (!STATUSES[body.status]) return jsonError("Invalid status");
    update.status = body.status;
  }
  if (body.requests !== undefined) {
    if (!Array.isArray(body.requests)) return jsonError("Invalid requests");
    update.requests = body.requests.slice(0, 50).map((r) => ({
      id: String(r.id || Math.random().toString(36).slice(2, 10)).replace(/[^\w-]/g, "").slice(0, 20),
      label: String(r.label || "").slice(0, 300),
      note: String(r.note || "").slice(0, 1000),
      resolved: Boolean(r.resolved)
    })).filter((r) => r.label);
  }
  if (body.request_note !== undefined) update.request_note = String(body.request_note || "").slice(0, 4000);
  if (body.admin_notes !== undefined) update.admin_notes = String(body.admin_notes || "").slice(0, 20000);
  if (body.solution !== undefined) update.solution = String(body.solution || "").slice(0, 200000);
  if (body.publish) {
    if (!(update.solution ?? eng.solution)?.trim()) return jsonError("Write the solution before publishing.");
    update.solution_published_at = new Date().toISOString();
    update.status = "solution_ready";
  }
  if (body.unpublish) {
    update.solution_published_at = null;
    if (eng.status === "solution_ready") update.status = "in_review";
  }

  const { data, error } = await db().from("engagements").update(update).eq("id", eng.id).select("*").single();
  if (error) return jsonError(error.message, 500);

  if (body.publish) await notify(`Solution published for ${eng.client_name || eng.client_email} (${eng.company_name || ""}).`);
  return Response.json({ engagement: data });
}
