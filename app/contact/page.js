"use client";
import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const mailtoHref = `mailto:Pkjammi@gmail.com?subject=${encodeURIComponent(
    "Website inquiry from " + (name || "a visitor")
  )}&body=${encodeURIComponent((message || "") + (email ? `\n\nReply to: ${email}` : ""))}`;

  return (
    <div className="wrap">
      <span className="eyebrow">Get in touch</span>
      <h1>Contact Us</h1>
      <p className="sub" style={{ marginBottom: 28 }}>
        Have a question before starting a diagnostic, or want to talk through your situation directly?
        Send us a message.
      </p>

      <div className="card" style={{ maxWidth: 480 }}>
        <form className="authform" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            rows={5}
            style={{ width: "100%", marginTop: 0 }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <a href={mailtoHref} style={{ textDecoration: "none" }}>
            <button className="primary" type="button" style={{ marginTop: 18, width: "100%" }}>
              Send message
            </button>
          </a>
          <p className="sub" style={{ marginTop: 14, fontSize: 12.5 }}>
            This opens your email app with the message pre-filled — nothing is sent from this page directly.
          </p>
        </form>
      </div>
    </div>
  );
}
