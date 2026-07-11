import { ONEPAGER_SYSTEM } from "../../../lib/categories";

export async function POST(req) {
  try {
    const { transcript } = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: ONEPAGER_SYSTEM,
        messages: [{ role: "user", content: "Here is the diagnostic transcript:\n\n" + transcript }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: "Claude API error", detail: errText }, { status: 502 });
    }

    const data = await response.json();
    const text = (data.content || []).map((b) => b.text || "").join("\n");
    return Response.json({ text });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
