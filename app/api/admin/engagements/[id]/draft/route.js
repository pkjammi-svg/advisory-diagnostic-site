import Anthropic from "@anthropic-ai/sdk";
import { SERVICES, allFields, formatValue, isEmpty } from "../../../../../../lib/services";
import { getCurrentUser, jsonError, loadEngagementFor, loadFiles } from "../../../../../../lib/auth";

export const maxDuration = 300;

const SYSTEM = `You are a senior business consultant with deep audit, finance and operations experience in India and the US. You draft client-ready solution write-ups for an advisory practice.

Write in clear, plain business English. Use the exact section outline you are given (markdown "## " headings, "-" bullets, "|" tables). Base every statement on the client's information; where information is missing, say what is assumed or what is still needed instead of inventing figures. Mark estimates as estimates. The consultant will review and edit your draft before the client sees it.`;

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return jsonError("Admins only", 403);
  if (!process.env.ANTHROPIC_API_KEY) return jsonError("ANTHROPIC_API_KEY is not set on the server.", 500);

  const eng = await loadEngagementFor(user, params.id, { admin: true });
  if (!eng) return jsonError("Not found", 404);
  const service = SERVICES[eng.service];
  const files = await loadFiles(eng.id);
  const { extra } = await req.json().catch(() => ({}));

  const answers = allFields(service)
    .filter((f) => !isEmpty(eng.inputs?.[f.key]))
    .map((f) => `- ${f.label}: ${formatValue(f, eng.inputs[f.key])}`)
    .join("\n");
  const docs = files
    .filter((f) => f.doc_type !== "deliverable")
    .map((f) => `- ${f.file_name} (${service.documents.find((d) => d.key === f.doc_type)?.label || f.doc_type})`)
    .join("\n") || "- none";

  const prompt = `Service: ${service.label}
Client: ${eng.client_name || ""} ${eng.company_name ? `— ${eng.company_name}` : ""}

Client answers:
${answers || "- (none)"}

Documents uploaded (file contents not included):
${docs}
${extra ? `\nConsultant's notes and analysis to incorporate:\n${String(extra).slice(0, 30000)}\n` : ""}
Draft the solution using this outline:

${service.solutionTemplate}`;

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }]
    });

    if (response.stop_reason === "refusal") {
      return jsonError("The model declined to draft this one — please write it manually.", 422);
    }
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    return Response.json({ text });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return jsonError("Rate limited — try again in a minute.", 429);
    if (err instanceof Anthropic.APIError) return jsonError(`Claude API error ${err.status}: ${err.message}`, 502);
    return jsonError(err.message, 500);
  }
}
