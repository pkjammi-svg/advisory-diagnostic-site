import Link from "next/link";
import { createSupabaseServerClient } from "../lib/supabase/server";

export default async function AuthNav() {
  let user = null;

  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.auth.getUser();
    user = result?.data?.user || null;
  } catch (err) {
    user = null;
  }

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
