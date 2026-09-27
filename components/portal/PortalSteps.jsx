const STEPS = ["Choose service", "Share data", "Confirmation", "Solution"];

export default function PortalSteps({ current, engagementId, solutionReady }) {
  const hrefs = engagementId
    ? ["/services", `/engagement/${engagementId}/data`, `/engagement/${engagementId}/confirmation`, solutionReady ? `/engagement/${engagementId}/solution` : null]
    : ["/services", null, null, null];
  return (
    <ol className="portal-steps" aria-label="Progress">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "current" : "todo";
        const content = (
          <>
            <span className="step-dot">{n < current ? "✓" : n}</span>
            <span className="step-label">{s}</span>
          </>
        );
        return (
          <li key={s} className={`portal-step ${state}`} aria-current={state === "current" ? "step" : undefined}>
            {hrefs[i] && state !== "current" ? <a href={hrefs[i]}>{content}</a> : content}
          </li>
        );
      })}
    </ol>
  );
}
