import { notFound, redirect } from "next/navigation";
import { getCurrentUser, loadEngagementFor } from "../../../lib/auth";

export default async function EngagementIndex({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const eng = await loadEngagementFor(user, params.id);
  if (!eng) notFound();
  if (user.isAdmin && eng.user_id !== user.id) redirect(`/admin/engagements/${eng.id}`);
  if (eng.status === "solution_ready") redirect(`/engagement/${eng.id}/solution`);
  if (eng.status === "draft" || eng.status === "needs_info") redirect(`/engagement/${eng.id}/data`);
  redirect(`/engagement/${eng.id}/confirmation`);
}
