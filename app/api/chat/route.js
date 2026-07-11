import { CATEGORIES } from "../../../lib/categories";

export async function POST(req) {
  try {
    const { category, messages } = await req.json();
    const cat = CATEGORIES[category];
    if (!cat) {
      return Response.json({ error: "Unknown category" }, { status: 400 });
    }

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
        system: cat.system,
        messages
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
