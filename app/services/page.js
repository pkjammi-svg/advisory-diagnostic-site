import Link from "next/link";
import { redirect } from "next/navigation";
import { SERVICES, docApplies } from "../../lib/services";
import { db, getCurrentUser } from "../../lib/auth";
import StartServiceButton from "../../components/portal/StartServiceButton";
import PortalSteps from "../../components/portal/PortalSteps";

export default async function ServicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/services");

  const { data: drafts } = await db()
    .from("engagements")
    .select("id, service, updated_at")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .order("updated_at", { ascending: false });

  const name = user.user_metadata?.full_name?.split(" ")[0];

  return (
    <div className="wrap">
      <PortalSteps current={1} />
      <span className="eyebrow">Step 1 of 4 · Choose a service</span>
      <h1 className="page-title">{name ? `Welcome, ${name}. ` : ""}How can we help your business?</h1>
      <p className="sub" style={{ maxWidth: 680, marginBottom: 26 }}>
        Pick the service closest to what you need. You'll answer a few structured questions and upload
        supporting documents — you can save and come back at any time.
      </p>

      {drafts?.length > 0 && (
        <div className="notice">
          You have {drafts.length} unfinished request{drafts.length > 1 ? "s" : ""}:{" "}
          {drafts.map((d, i) => (
            <span key={d.id}>
              {i > 0 && ", "}
              <Link className="link" href={`/engagement/${d.id}/data`}>{SERVICES[d.service]?.short}</Link>
            </span>
          ))}
        </div>
      )}

      <div className="service-grid">
        {Object.values(SERVICES).map((s) => {
          const needed = s.documents.filter((d) => d.required && !d.when);
          return (
            <div key={s.key} className="service-card">
              <span className="service-num">{s.number}</span>
              <h2>{s.label}</h2>
              <p className="sub">{s.desc}</p>
              <div className="service-cols">
                <div>
                  <span className="mini-head">What you get</span>
                  <ul className="tick-list">
                    {s.deliverables.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                </div>
                <div>
                  <span className="mini-head">What we'll ask for</span>
                  <ul className="dot-list">
                    <li>{s.sections.length} short question sections</li>
                    {needed.length > 0
                      ? needed.map((d) => <li key={d.key}>{d.label}</li>)
                      : <li>Supporting documents are optional</li>}
                    {s.documents.some((d) => d.when) && <li>Other documents depending on your answers</li>}
                  </ul>
                </div>
              </div>
              <div style={{ marginTop: "auto", paddingTop: 16 }}>
                <StartServiceButton service={s.key} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
