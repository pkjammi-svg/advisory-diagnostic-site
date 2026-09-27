// Optional Slack / Zapier webhook notification (same NOTIFY_WEBHOOK_URL as leads).
export async function notify(text) {
  if (!process.env.NOTIFY_WEBHOOK_URL) return;
  try {
    await fetch(process.env.NOTIFY_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
  } catch (err) {
    console.error("Notify webhook failed:", err.message);
  }
}
