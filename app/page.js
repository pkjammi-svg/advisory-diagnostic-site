import { CATEGORIES } from "../lib/categories";
import JourneyStrip from "../components/JourneyStrip";
 
export default function Home() {
  return (
    <>
      <div className="band band-paper">
        <div className="band-inner hero">
          <span className="eyebrow">Business diagnostic</span>
          <h1>Most businesses guess at the problem.<br />We isolate the real one.</h1>
          <p className="sub">
            Pick what's closest to your situation. A short guided conversation gathers the facts —
            no assumptions, no generic advice — before anything is suggested.
          </p>
        </div>
      </div>
 
      <div className="band band-tint">
        <div className="band-inner" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <JourneyStrip />
        </div>
      </div>
 
      <div className="band band-white">
        <section id="services" className="band-inner section">
          <div className="section-head">
            <h2>Our Services</h2>
            <p className="sub">Start with what's closest to your situation. Each one runs the same short, guided diagnostic before anything is suggested.</p>
          </div>
          <div className="cat-grid">
            {Object.entries(CATEGORIES).map(([key, c]) => (
              <a key={key} className="cat-btn" href={`/diagnostic/${key}`}>
                <span className="tag">Start diagnostic</span>
                <h3>{c.label}</h3>
                <p>{c.desc}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
 
      <div className="band band-paper">
        <section id="about" className="band-inner section">
          <div className="about-grid">
            <div>
              <span className="eyebrow">About us</span>
              <h2>Info to Impact</h2>
              <p>
                InfotoImpact is a business diagnostic practice built on one principle: understand the
                real problem before proposing a solution. Most businesses that come to us already have
                a theory about what's wrong — and it's usually incomplete. We run a short, structured
                conversation to gather the facts, test the obvious assumption against the evidence, and
                isolate what's actually driving the problem.
              </p>
              <p>
                What you get first isn't a sales pitch — it's a clear, honest one-pager on what we found,
                and only then, if it's useful to you, our help on what to do next.
              </p>
            </div>
            <ul className="principle-list">
              <li><strong>01 — Define the problem</strong>Set clear boundaries on what it is, and what it isn't.</li>
              <li><strong>02 — Assess prior effort</strong>Understand what's already been tried, so we don't repeat it.</li>
              <li><strong>03 — Diagnose root causes</strong>List every potential reason, not just the obvious one.</li>
              <li><strong>04 — Isolate and act</strong>Rule out what isn't the real cause, then build a measurable plan.</li>
            </ul>
          </div>
        </section>
      </div>
 
      <div className="band band-tint">
        <section id="team" className="band-inner section">
          <div className="section-head">
            <span className="eyebrow">Our experience</span>
            <h2>Real experience, not theory.</h2>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink)", maxWidth: 660, marginBottom: 14 }}>
            InfotoImpact is built on more than 17 years of consulting and audit experience across
            India and the US — advising businesses through some of the world&rsquo;s most respected
            professional services firms, and later applying that same rigor as founders building and
            running our own companies from the ground up.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink)", maxWidth: 660, marginBottom: 14 }}>
            We&rsquo;ve sat on both sides of the table: as advisors bringing structured, unbiased
            analysis to complex problems, and as operators responsible for real sales, real P&amp;L,
            and real decisions — across both B2B and B2C markets. That combination of advisory
            discipline and hands-on business-building is what shapes how we diagnose your problem and
            guide you toward the right next step.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink)", maxWidth: 660, marginBottom: 30 }}>
            Having worked closely with both Indian and US businesses, we&rsquo;ve seen what works, what
            doesn&rsquo;t, and why the same solution rarely fits both markets the same way. That&rsquo;s
            the perspective we bring to every diagnostic.
          </p>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-num">17+ years</span>
              <span className="stat-label">Consulting &amp; audit experience across India and the US</span>
            </div>
            <div className="stat-card">
              <span className="stat-num">Founder-operator</span>
              <span className="stat-label">Built and ran our own businesses, not just advised others</span>
            </div>
            <div className="stat-card">
              <span className="stat-num">B2B &amp; B2C</span>
              <span className="stat-label">Sales and go-to-market experience across both models</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
