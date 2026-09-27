import { SERVICES, allFields, assess, STATUSES } from "../../../../lib/services";
import { db, getCurrentUser, jsonError, loadEngagementFor, loadFiles } from "../../../../lib/auth";
import { notify } from "../../../../lib/notify";

const MAX_TEXT = 10000;

function cleanInputs(service, requests, raw = {}) {
  const out = {};
  for (const f of allFields(service)) {
    const v = raw[f.key];
    if (v === undefined || v === null) continue;
    if (f.type === "multiselect") {
      out[f.key] = Array.isArray(v) ? v.filter((x) => f.options.includes(x)) : [];
    } else if (f.type === "select") {
      if (f.options.includes(v)) out[f.key] = v;
    } else {
      out[f.key] = String(v).slice(0, MAX_TEXT);
    }
  }
  for (const r of requests || []) {
    const v = raw[`req:${r.id}`];
    if (v !== undefined && v !== null) out[`req:${r.id}`] = String(v).slice(0, MAX_TEXT);
  }
  return out;
}

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in", 401);
  const eng = await loadEngagementFor(user, params.id);
  if (!eng || eng.user_id !== user.id) return jsonError("Not found", 404);
  if (eng.status === "solution_ready") return jsonError("This request is closed. Start a new request to share more information.");

  const body = await req.json().catch(() => ({}));
  const service = SERVICES[eng.service];
  const inputs = cleanInputs(service, eng.requests, body.inputs);
  const update = {
    inputs,
    company_name: inputs.company_name || inputs.business_name || eng.company_name,
    updated_at: new Date().toISOString()
  };

  if (body.submit) {
    const files = await loadFiles(eng.id);
    const a = assess(eng.service, inputs, files, eng.requests);
    if (a.missingFields.length) {
      return jsonError(`Please answer the required questions first: ${a.missingFields.map((f) => f.label).join("; ")}`);
    }
    if (eng.status === "draft" || eng.status === "needs_info") update.status = "submitted";
    update.submitted_at = new Date().toISOString();
  }

  const { error } = await db().from("engagements").update(update).eq("id", eng.id);
  if (error) return jsonError(error.message, 500);

  if (body.submit) {
    await notify(
      `Portal submission: ${eng.client_name || eng.client_email} (${update.company_name || "no company"}) — ${service.label}. Status: ${STATUSES[update.status || eng.status].label}.`
    );
  }
  return Response.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in", 401);
  const eng = await loadEngagementFor(user, params.id);
  if (!eng || eng.user_id !== user.id) return jsonError("Not found", 404);
  if (eng.status !== "draft") return jsonError("Only draft requests can be deleted.");

  const { data: files } = await db().from("engagement_files").select("storage_path").eq("engagement_id", eng.id);
  if (files?.length) await db().storage.from("engagement-files").remove(files.map((f) => f.storage_path));
  await db().from("engagements").delete().eq("id", eng.id);
  return Response.json({ ok: true });
}
