export default function TermsPage() {
  return (
    <div className="wrap">
      <span className="eyebrow">Legal</span>
      <h1>Terms and Conditions</h1>
      <p className="sub" style={{ marginBottom: 28 }}>Last updated: [add date before publishing]</p>

      <div className="card">
        <p className="editable-note" style={{ marginBottom: 20 }}>
          [Draft content below — please have this reviewed by a lawyer before publishing.]
        </p>

        <h2 style={{ fontSize: 16, color: "var(--indigo-deep)", fontFamily: "var(--font-display)" }}>Using this site</h2>
        <p className="sub">
          By using the diagnostic tools on this site, you agree to provide accurate information to
          the best of your knowledge. The diagnostic conversation is a starting point for
          understanding your business problem, not a guaranteed diagnosis.
        </p>

        <h2 style={{ fontSize: 16, color: "var(--indigo-deep)", fontFamily: "var(--font-display)", marginTop: 22 }}>What we provide</h2>
        <p className="sub">
          Our free diagnostic identifies and summarizes a business problem based on the information
          you share. It does not include implementation, ongoing advice, or a guaranteed outcome
          unless separately agreed as a paid engagement.
        </p>

        <h2 style={{ fontSize: 16, color: "var(--indigo-deep)", fontFamily: "var(--font-display)", marginTop: 22 }}>Out of scope</h2>
        <p className="sub">
          We do not provide legal, tax, medical, or other licensed professional advice. Where your
          situation requires this, we'll say so and point you toward the right kind of professional.
        </p>

        <h2 style={{ fontSize: 16, color: "var(--indigo-deep)", fontFamily: "var(--font-display)", marginTop: 22 }}>Accounts</h2>
        <p className="sub">
          If you create an account, you're responsible for keeping your login details secure. You can
          request deletion of your account and data at any time by contacting us.
        </p>

        <h2 style={{ fontSize: 16, color: "var(--indigo-deep)", fontFamily: "var(--font-display)", marginTop: 22 }}>Changes</h2>
        <p className="sub">
          We may update these terms from time to time. Continued use of the site after a change means
          you accept the updated terms.
        </p>

        <h2 style={{ fontSize: 16, color: "var(--indigo-deep)", fontFamily: "var(--font-display)", marginTop: 22 }}>Contact</h2>
        <p className="sub">
          Questions about these terms: Pkjammi@gmail.com.
        </p>
      </div>
    </div>
  );
}
