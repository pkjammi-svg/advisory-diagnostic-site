"use client";
import { useState, useRef, useEffect } from "react";
import { CATEGORIES } from "../lib/categories";

function mdToHtml(md) {
  return md
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (line.trim() === "") return "";
      return `<p>${line}</p>`;
    })
    .join("");
}

export default function DiagnosticChat({ category }) {
  const cat = CATEGORIES[category];
  const [messages, setMessages] = useState([]);
  const [qCount, setQCount] = useState(0);
  const [phase, setPhase] = useState("loading-first"); // loading-first | chat | loading | onepager
  const [input, setInput] = useState("");
  const [onepager, setOnepager] = useState("");
  const [sending, setSending] = useState(false);
  const [schedStatus, setSchedStatus] = useState(null);
  const logRef = useRef(null);

  useEffect(() => {
    startConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  async function callChat(msgs) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, messages: msgs })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.detail || data.error);
    return data.text;
  }

  async function startConversation() {
    setPhase("loading-first");
    const reply = await callChat([{ role: "user", content: "Begin the diagnostic conversation. Ask your first question." }]);
    setMessages([{ role: "assistant", content: reply }]);
    setQCount(1);
    setPhase("chat");
  }

  async function sendAnswer() {
    const val = input.trim();
    if (!val || sending) return;
    const newMessages = [...messages, { role: "user", content: val }];
    setMessages(newMessages);
    setInput("");
    setSending(true);

    try {
      const reply = await callChat(newMessages);
      if (reply.includes("READY_FOR_SUMMARY") || qCount >= 8) {
        const cleaned = reply.replace("READY_FOR_SUMMARY", "").trim();
        const finalMessages = cleaned ? [...newMessages, { role: "assistant", content: cleaned }] : newMessages;
        setMessages(finalMessages);
        await generateOnePager(finalMessages);
      } else {
        setMessages([...newMessages, { role: "assistant", content: reply }]);
        setQCount(qCount + 1);
      }
    } catch (err) {
      setMessages([...newMessages, { role: "assistant", content: "Something went wrong reaching the assistant. Please try again." }]);
    }
    setSending(false);
  }

  async function generateOnePager(finalMessages) {
    setPhase("loading");
    const transcript = finalMessages.map((m) => (m.role === "assistant" ? "Consultant: " : "Client: ") + m.content).join("\n\n");
    const res = await fetch("/api/onepager", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript })
    });
    const data = await res.json();
    setOnepager(data.text || "Something went wrong generating the summary.");
    setPhase("onepager");
  }

  async function submitSchedule(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const contact = form.contact.value.trim();
    const preferredDay = form.day.value.trim();
    const preferredTime = form.time.value.trim();

    if (!name || !contact) {
      setSchedStatus({ ok: false, msg: "Please add at least a name and a way to reach you." });
      return;
    }

    const transcript = messages.map((m) => (m.role === "assistant" ? "Consultant: " : "Client: ") + m.content).join("\n\n");

    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contact, category, preferredDay, preferredTime, transcript, onepager })
    });
    const data = await res.json();
    if (data.ok) {
      setSchedStatus({ ok: true, msg: `Thanks ${name} — noted for ${preferredDay || "a day"}, ${preferredTime || "a time"}. We'll reach out at ${contact}.` });
    } else {
      setSchedStatus({ ok: false, msg: "Something went wrong saving your request. Please try again." });
    }
  }

  if (phase === "loading-first") {
    return (
      <div className="card">
        <span className="badge">{cat.label}</span>
        <p className="loading">Thinking of the first question...</p>
      </div>
    );
  }

  if (phase === "chat" || phase === "loading") {
    return (
      <div className="card">
        <span className="badge">{cat.label}</span>
        <div className="qcount">Question {qCount} of ~8 · <a href="/">Start over</a></div>
        <div id="chatlog" ref={logRef}>
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === "assistant" ? "ai" : "user"}`}>{m.content}</div>
          ))}
        </div>
        {phase === "loading" && <p className="loading">Putting together the one-pager...</p>}
        {phase === "chat" && (
          <div className="inputrow">
            <textarea
              rows={2}
              placeholder="Type your answer..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAnswer(); }
              }}
            />
            <button className="primary" onClick={sendAnswer} disabled={sending}>Send</button>
          </div>
        )}
      </div>
    );
  }

  if (phase === "onepager") {
    return (
      <>
        <div className="card">
          <span className="badge">{cat.label} — your summary</span>
          <div className="onepager" dangerouslySetInnerHTML={{ __html: mdToHtml(onepager) }} />
        </div>
        <div className="card">
          <h1 style={{ fontSize: 16 }}>Want us to walk you through this?</h1>
          <p className="sub">Leave your details and a time that works, and we'll reach out.</p>
          <form onSubmit={submitSchedule}>
            <div className="formgrid">
              <input name="name" placeholder="Name" />
              <input name="contact" placeholder="Email or phone" />
              <input name="day" placeholder="Preferred day (e.g. Thursday)" />
              <input name="time" placeholder="Preferred time window (e.g. 4-6pm)" />
            </div>
            <button className="primary" style={{ marginTop: 12 }} type="submit">Request a callback</button>
          </form>
          {schedStatus && (
            <p style={{ color: schedStatus.ok ? "#2E7D32" : "#B3261E", fontSize: 13, marginTop: 10 }}>{schedStatus.msg}</p>
          )}
        </div>
        <a href="/" className="link" style={{ fontSize: 13 }}>Start over</a>
      </>
    );
  }

  return null;
}
