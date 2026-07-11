export default function PolicyPage() {
  return (
    <div className="wrap">
      <span className="eyebrow">Legal</span>
      <h1>Policy and Procedures</h1>
      <p className="sub" style={{ marginBottom: 28 }}>Last updated: [add date before publishing]</p>

      <div className="card">
        <p className="editable-note" style={{ marginBottom: 20 }}>
          [Draft content below — please have this reviewed by a lawyer before publishing. It covers
          the basics of what we do with your data, but isn't a substitute for proper legal review.]
        </p>

        <h2 style={{ fontSize: 16, color: "var(--indigo-deep)", fontFamily: "var(--font-display)" }}>What we collect</h2>
        <p className="sub">
          When you use a diagnostic on this site, we collect what you tell us during the conversation
          (your answers), and, if you create an account or request a callback, your name and contact
          details.
        </p>

        <h2 style={{ fontSize: 16, color: "var(--indigo-deep)", fontFamily: "var(--font-display)", marginTop: 22 }}>How we use it</h2>
        <p className="sub">
          Your diagnostic conversation is used to generate your one-pager summary and, if you're
          signed in, saved to your account so you can view it later. If you request a callback, we
          use your contact details only to reach out about your request.
        </p>

        <h2 style={{ fontSize: 16, color: "var(--indigo-deep)", fontFamily: "var(--font-display)", marginTop: 22 }}>What we don't do</h2>
        <p className="sub">
          We don't sell your data to third parties. We don't use your business details for anything
          beyond delivering the service you asked for.
        </p>

        <h2 style={{ fontSize: 16, color: "var(--indigo-deep)", fontFamily: "var(--font-display)", marginTop: 22 }}>Illustrative examples</h2>
        <p className="sub">
          Any example or sample walkthrough shown on this site uses a fictional company and figures,
          created to demonstrate our approach — never real client data.
        </p>

        <h2 style={{ fontSize: 16, color: "var(--indigo-deep)", fontFamily: "var(--font-display)", marginTop: 22 }}>Scope of our advice</h2>
        <p className="sub">
          Our diagnostics identify and describe business problems. They are not legal, tax, or
          financial advice, and are not a substitute for a licensed professional where one is needed.
        </p>

        <h2 style={{ fontSize: 16, color: "var(--indigo-deep)", fontFamily: "var(--font-display)", marginTop: 22 }}>Contact</h2>
        <p className="sub">
          Questions about this policy: Pkjammi@gmail.com.
        </p>
      </div>
    </div>
  );
}
