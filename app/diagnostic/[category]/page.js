import DiagnosticChat from "../../../components/DiagnosticChat";
import { CATEGORIES } from "../../../lib/categories";

export default function DiagnosticPage({ params }) {
  const category = params.category;
  if (!CATEGORIES[category]) {
    return (
      <div className="wrap">
        <div className="card">
          <h1>Category not found</h1>
          <p className="sub">
            <a href="/">Go back to the homepage</a>
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="wrap">
      <DiagnosticChat category={category} />
    </div>
  );
}
