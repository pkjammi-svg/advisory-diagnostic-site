import Link from "next/link";
import Logo from "./Logo";
import { createSupabaseServerClient } from "../lib/supabase/server";

export default async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">
          <Logo size={24} />
          InfotoImpact
        </Link>
        <nav className="nav-links">
          <Link href="/#about">About</Link>
          <Link href="/#services">Services</Link>
          <Link href="/#team">Our Experience</Link>
          <Link href="/contact">Contact</Link>
          {user ? (
            <>
              <Link href="/history">My diagnostics</Link>
              <form action="/api/auth/signout" method="post">
                <button className="nav-btn" type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Sign in</Link>
              <Link href="/signup" className="nav-btn">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
