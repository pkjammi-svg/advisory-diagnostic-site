import { db, getCurrentUser, jsonError, loadEngagementFor } from "../../../../../lib/auth";
import { allowedDocType } from "../../../../../lib/docTypes";

// Records an uploaded file against the engagement once the browser upload succeeds.
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in", 401);
  const eng = await loadEngagementFor(user, params.id, { admin: true });
  if (!eng) return jsonError("Not found", 404);

  const { docType, fileName, path, size } = await req.json().catch(() => ({}));
  if (!docType || !allowedDocType(eng, docType, user.isAdmin)) return jsonError("Invalid document type");
  if (!path || !path.startsWith(`${eng.id}/${docType.replace(":", "_")}/`) || path.includes("..")) return jsonError("Invalid path");

  const { data, error } = await db()
    .from("engagement_files")
    .insert({
      engagement_id: eng.id,
      user_id: user.id,
      doc_type: docType,
      file_name: String(fileName || "file").slice(0, 200),
      storage_path: path,
      size_bytes: Number(size) || null,
      uploaded_by_admin: user.isAdmin && eng.user_id !== user.id
    })
    .select("id, engagement_id, doc_type, file_name, size_bytes, uploaded_by_admin, created_at")
    .single();
  if (error) return jsonError(error.message, 500);

  await db().from("engagements").update({ updated_at: new Date().toISOString() }).eq("id", eng.id);
  return Response.json({ file: data });
}
