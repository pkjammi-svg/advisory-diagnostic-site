import Link from "next/link";
import { getCurrentUser } from "../lib/auth";

export default async function AuthNav() {
  const user = await getCurrentUser();

  if (user) {
    return (
      <>
        {user.isAdmin && <Link href="/admin">Admin</Link>}
        <Link href="/dashboard">My dashboard</Link>
        <Link href="/services">New request</Link>
        <form action="/api/auth/signout" method="post">
          <button className="nav-btn" type="submit">Sign out</button>
        </form>
      </>
    );
  }

  return (
    <>
      <Link href="/login">Client login</Link>
      <Link href="/signup" className="nav-btn">Sign up</Link>
    </>
  );
}
