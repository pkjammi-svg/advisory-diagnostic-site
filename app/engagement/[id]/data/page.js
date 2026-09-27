import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SERVICES, STATUSES } from "../../../../lib/services";
import { getCurrentUser, loadEngagementFor, loadFiles } from "../../../../lib/auth";
import DataCollectionForm from "../../../../components/portal/DataCollectionForm";
import PortalSteps from "../../../../components/portal/PortalSteps";

export default async function DataPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const eng = await loadEngagementFor(user, params.id);
  if (!eng || eng.user_id !== user.id) notFound();
  const files = (await loadFiles(eng.id)).filter((f) => f.doc_type !== "deliverable");
  const service = SERVICES[eng.service];

  return (
    <div className="wrap">
      <PortalSteps current={2} engagementId={eng.id} solutionReady={eng.status === "solution_ready"} />
      <span className="eyebrow">Step 2 of 4 · Share your information</span>
      <h1 className="page-title">{service.label}</h1>
      <p className="sub" style={{ maxWidth: 700, marginBottom: 6 }}>{service.desc}</p>
      <p className="sub" style={{ marginBottom: 24 }}>
        Status: <span className={`status-pill tone-${STATUSES[eng.status].tone}`}>{STATUSES[eng.status].label}</span>
        {" · "}<Link className="link" href="/dashboard">Back to my dashboard</Link>
      </p>
      <DataCollectionForm engagement={eng} initialFiles={files} />
    </div>
  );
}
