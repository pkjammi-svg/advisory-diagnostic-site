import { notFound, redirect } from "next/navigation";
import { getCurrentUser, loadEngagementFor, loadFiles } from "../../../../lib/auth";
import AdminWorkspace from "../../../../components/admin/AdminWorkspace";

export default async function AdminEngagementPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) notFound();
  const eng = await loadEngagementFor(user, params.id, { admin: true });
  if (!eng) notFound();
  const files = await loadFiles(eng.id);
  return (
    <div className="wrap">
      <AdminWorkspace initialEngagement={eng} initialFiles={files} />
    </div>
  );
}
