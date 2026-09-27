import { SERVICES } from "../../../lib/services";
import { db, getCurrentUser, jsonError } from "../../../lib/auth";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in", 401);

  const { service } = await req.json().catch(() => ({}));
  if (!SERVICES[service]) return jsonError("Unknown service");

  const meta = user.user_metadata || {};
  const inputs = {};
  if (meta.company) {
    if (service === "startup") inputs.business_name = meta.company;
    else inputs.company_name = meta.company;
  }

  const { data, error } = await db()
    .from("engagements")
    .insert({
      user_id: user.id,
      service,
      status: "draft",
      client_name: meta.full_name || null,
      client_email: user.email,
      company_name: meta.company || null,
      inputs
    })
    .select("id")
    .single();

  if (error) return jsonError(error.message, 500);
  return Response.json({ id: data.id });
}
