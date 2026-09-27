import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";

// Landing spot after login: consultants go to the admin dashboard,
// clients go to the service selection page.
export default async function PortalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(user.isAdmin ? "/admin" : "/services");
}
