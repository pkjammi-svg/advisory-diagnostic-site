import { CATEGORIES } from "../lib/categories";

export default function Home() {
  return (
    <div className="wrap">
      <div className="card">
        <h1>What business problem are you facing?</h1>
        <p className="sub">
          Pick what's closest to your situation. We'll ask a few quick questions to understand
          the real problem before suggesting anything.
        </p>
        <div className="cat-grid">
          {Object.entries(CATEGORIES).map(([key, c]) => (
            <a key={key} className="cat-btn" href={`/diagnostic/${key}`}>
              <h3>{c.label}</h3>
              <p>{c.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
