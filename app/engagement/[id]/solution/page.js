import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SERVICES } from "../../../../lib/services";
import { getCurrentUser, loadEngagementFor, loadFiles } from "../../../../lib/auth";
import { formatBytes, formatDate } from "../../../../lib/format";
import { markdownToHtml } from "../../../../lib/markdown";
import PortalSteps from "../../../../components/portal/PortalSteps";
import PrintButton from "../../../../components/portal/PrintButton";

export default async function SolutionPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const eng = await loadEngagementFor(user, params.id);
  if (!eng || eng.user_id !== user.id) notFound();
  const service = SERVICES[eng.service];

  if (!eng.solution_published_at) {
    return (
      <div className="wrap">
        <PortalSteps current={4} engagementId={eng.id} />
        <span className="eyebrow">Step 4 of 4 · Solution</span>
        <h1 className="page-title">Your solution is being prepared</h1>
        <div className="card">
          <p className="sub">
            We're working on your {service.short.toLowerCase()}. It will appear here as soon as it's ready.
            Meanwhile you can check <Link className="link" href={`/engagement/${eng.id}/confirmation`}>what we've received</Link> or
            add anything else we've asked for.
          </p>
        </div>
      </div>
    );
  }

  const deliverables = (await loadFiles(eng.id)).filter((f) => f.doc_type === "deliverable");

  return (
    <div className="wrap">
      <PortalSteps current={5} engagementId={eng.id} solutionReady />
      <div className="solution-head">
        <div>
          <span className="eyebrow">Step 4 of 4 · Your solution</span>
          <h1 className="page-title">{service.label}</h1>
          <p className="sub">
            Prepared for {eng.client_name || eng.client_email}{eng.company_name ? `, ${eng.company_name}` : ""} · {formatDate(eng.solution_published_at)} · Ref #{eng.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <PrintButton />
      </div>

      {deliverables.length > 0 && (
        <section className="card no-print">
          <h2 className="card-title">Your deliverables</h2>
          <ul className="deliverable-list">
            {deliverables.map((f) => (
              <li key={f.id}>
                <a href={`/api/files/${f.id}`} className="deliverable">
                  <span className="deliverable-icon" aria-hidden="true">↓</span>
                  <span>{f.file_name}</span>
                  <span className="file-size">{formatBytes(f.size_bytes)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <article className="card solution-body md" dangerouslySetInnerHTML={{ __html: markdownToHtml(eng.solution) }} />

      <section className="card no-print">
        <h2 className="card-title">Questions or next steps?</h2>
        <p className="sub">
          We're happy to walk you through the findings or help implement the recommendations.
          {" "}<Link className="link" href="/contact">Contact us</Link> or start a <Link className="link" href="/services">new request</Link>.
        </p>
      </section>
    </div>
  );
}
