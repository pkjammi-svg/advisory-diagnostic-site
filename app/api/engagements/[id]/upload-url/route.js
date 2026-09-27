import { db, getCurrentUser, jsonError, loadEngagementFor } from "../../../../../lib/auth";
import { allowedDocType, safeFileName } from "../../../../../lib/docTypes";

// Returns a one-time signed upload URL so the browser uploads straight to
// Supabase Storage (avoids the serverless request-size limit).
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in", 401);
  const eng = await loadEngagementFor(user, params.id, { admin: true });
  if (!eng) return jsonError("Not found", 404);

  const { docType, fileName } = await req.json().catch(() => ({}));
  if (!docType || !allowedDocType(eng, docType, user.isAdmin)) return jsonError("Invalid document type");
  if (!user.isAdmin && eng.status === "solution_ready") return jsonError("This request is closed.");

  const path = `${eng.id}/${docType.replace(":", "_")}/${Date.now()}-${safeFileName(fileName)}`;
  const { data, error } = await db().storage.from("engagement-files").createSignedUploadUrl(path);
  if (error) return jsonError(error.message, 500);
  return Response.json({ path: data.path, token: data.token });
}
