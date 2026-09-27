import { NextResponse } from "next/server";
import { db, getCurrentUser, jsonError, loadEngagementFor } from "../../../../lib/auth";

async function loadFileFor(user, fileId) {
  const { data: file } = await db().from("engagement_files").select("*").eq("id", fileId).maybeSingle();
  if (!file) return {};
  const eng = await loadEngagementFor(user, file.engagement_id, { admin: true });
  if (!eng) return {};
  return { file, eng };
}

// Download: redirects to a short-lived signed URL.
export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in", 401);
  const { file, eng } = await loadFileFor(user, params.fileId);
  if (!file) return jsonError("Not found", 404);
  if (!user.isAdmin && file.doc_type === "deliverable" && !eng.solution_published_at) return jsonError("Not found", 404);

  const { data, error } = await db()
    .storage.from("engagement-files")
    .createSignedUrl(file.storage_path, 60, { download: file.file_name });
  if (error) return jsonError(error.message, 500);
  return NextResponse.redirect(data.signedUrl);
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in", 401);
  const { file, eng } = await loadFileFor(user, params.fileId);
  if (!file) return jsonError("Not found", 404);
  if (!user.isAdmin) {
    if (file.uploaded_by_admin || file.doc_type === "deliverable") return jsonError("Not allowed", 403);
    if (eng.status === "solution_ready") return jsonError("This request is closed.");
  }
  await db().storage.from("engagement-files").remove([file.storage_path]);
  await db().from("engagement_files").delete().eq("id", file.id);
  return Response.json({ ok: true });
}
