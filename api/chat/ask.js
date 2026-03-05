import { verifySession, cors } from "../_lib/auth.js";
import { buildAnalysisContext } from "../_lib/ai.js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CHAT_SYSTEM_PROMPT = `You are the AI coach inside AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

You have access to this athlete's complete data: power files, training load (CTL/ATL/TSB), body composition, sleep, HRV, recovery, blood work, DEXA scans, and connected integrations.

Your job: Answer training questions using their ACTUAL data. Be specific — reference their real numbers (FTP, W/kg, CTL, HRV, biomarkers). Give actionable answers with exact watts, durations, and protocols.

Rules:
- Use the athlete's real data in every answer. Never give generic advice.
- Be concise but specific (2-4 paragraphs max).
- Reference specific metrics: "Your FTP is 298W..." not "Your FTP is good..."
- When discussing training, give specific power targets based on their FTP.
- When discussing benchmarks, reference their actual Coggan classification.
- Be encouraging but honest. Celebrate strengths, be direct about limiters.
- NEVER give direct medical advice. You are NOT a doctor. For health topics (supplements, blood work, injuries, medical conditions), use "Research suggests...", "Consider asking your doctor about...", "Studies show X may help with Y...". Never say "Take X", "Start X", or "You should do X" for any health intervention.
- NEVER HALLUCINATE. Every number, date, metric, and claim must come directly from the athlete's actual data. Do NOT invent numbers, fabricate past activities, or make up data points. If a metric is not in the data, say so — never guess. Fewer accurate answers are always better than fabricated ones.`;

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { message, activityId, history } = req.body;
  if (!message) return res.status(400).json({ error: "Missing message" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured. Add it to your Vercel environment variables." });
  }

  try {
    // Build athlete data context (reuse existing infrastructure)
    let context = null;
    if (activityId) {
      context = await buildAnalysisContext(session.userId, activityId);
    }

    // Build conversation messages
    const messages = [];
    if (history?.length) {
      for (const msg of history.slice(-10)) {  // Last 10 messages for context
        messages.push({ role: msg.role, content: msg.text });
      }
    }
    messages.push({
      role: "user",
      content: context
        ? `[Athlete Data Context]\n${JSON.stringify(context)}\n\n[Question]\n${message}`
        : message,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: CHAT_SYSTEM_PROMPT,
      messages,
    });

    return res.status(200).json({ reply: response.content[0].text });
  } catch (err) {
    console.error("Ask Claude error:", err);
    const msg = err?.status === 401 ? "Invalid ANTHROPIC_API_KEY" : err?.message || "Failed to generate response";
    return res.status(500).json({ error: msg });
  }
}
