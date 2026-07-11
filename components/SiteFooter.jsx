import Link from "next/link";
import Logo from "./Logo";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-col footer-brand">
          <div className="brand" style={{ marginBottom: 10 }}>
            <Logo size={22} />
            InfotoImpact
          </div>
          <p className="sub" style={{ maxWidth: 260 }}>
            We find the real cause before we suggest the fix.
          </p>
        </div>

        <div className="footer-col">
          <span className="footer-heading">Company</span>
          <Link href="/#about">About Us</Link>
          <Link href="/#services">Our Services</Link>
          <Link href="/#team">Our Experience</Link>
          <Link href="/contact">Contact Us</Link>
        </div>

        <div className="footer-col">
          <span className="footer-heading">Legal</span>
          <Link href="/policy">Policy and Procedures</Link>
          <Link href="/terms">Terms and Conditions</Link>
        </div>
      </div>
      <div className="footer-bottom">
        © {new Date().getFullYear()} InfotoImpact. All rights reserved.
      </div>
    </footer>
  );
}
