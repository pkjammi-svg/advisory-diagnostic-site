import { getSupabaseServerClient } from "../../../lib/supabaseClient";

export async function POST(req) {
  try {
    const { name, contact, category, preferredDay, preferredTime, transcript, onepager } = await req.json();

    if (!name || !contact) {
      return Response.json({ error: "Name and contact are required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("leads").insert({
      name,
      contact,
      category,
      preferred_day: preferredDay,
      preferred_time: preferredTime,
      transcript,
      onepager
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Optional notification (Zapier catch-hook or Slack incoming webhook)
    if (process.env.NOTIFY_WEBHOOK_URL) {
      try {
        await fetch(process.env.NOTIFY_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `New lead: ${name} (${contact}) - ${category} - prefers ${preferredDay || "any day"} ${preferredTime || ""}`
          })
        });
      } catch (notifyErr) {
        // Don't fail the request just because the notification failed
        console.error("Notify webhook failed:", notifyErr.message);
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
