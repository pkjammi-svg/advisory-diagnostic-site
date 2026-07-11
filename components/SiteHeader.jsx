import Link from "next/link";
import { Suspense } from "react";
import Logo from "./Logo";
import AuthNav from "./AuthNav";

export default function SiteHeader() {
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
          <Suspense fallback={<span className="nav-user">...</span>}>
            <AuthNav />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
