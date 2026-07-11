import Link from "next/link";
import { createSupabaseServerClient } from "../lib/supabase/server";

export default async function AuthNav() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return (
      <>
        <Link href="/history">My diagnostics</Link>
        <form action="/api/auth/signout" method="post">
          <button className="nav-btn" type="submit">Sign out</button>
        </form>
      </>
    );
  }

  return (
    <>
      <Link href="/login">Sign in</Link>
      <Link href="/signup" className="nav-btn">Sign up</Link>
    </>
  );
}
