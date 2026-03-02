import { verifySession, cors } from "../_lib/auth.js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const config = { maxDuration: 60 };

const NUTRITION_PARSE_PROMPT = `You are a sports nutrition parser for AIM, a performance intelligence platform for endurance athletes.

Parse the athlete's free-text description of their ride fueling into structured nutrition data.

Return valid JSON:
{
  "items": [
    { "name": "SIS Go Gel", "qty": "2", "carbs": 44, "protein": 0, "fat": 0, "calories": 176, "icon": "\uD83C\uDF6B", "confidence": "high" }
  ],
  "totals": { "carbs": 120, "protein": 5, "fat": 3, "calories": 520 },
  "followUpQuestions": [
    { "question": "What size were your bottles?", "options": ["500ml", "620ml", "750ml", "1 liter"] }
  ]
}

Rules:
- Use common sports nutrition product databases for calorie/macro estimates
- If a brand is mentioned, use that brand's actual nutrition data
- If quantities are ambiguous, ask a follow-up question
- Icons: \uD83C\uDF6B for gels/bars, \uD83E\uDD64 for drinks, \uD83C\uDF4C for whole foods, \uD83D\uDC8A for supplements, \uD83D\uDCA7 for water
- Confidence: "high" for known brands, "medium" for generic items, "low" for ambiguous
- Return ONLY valid JSON, no markdown or explanation`;

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const { text, rideDuration } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Missing text field (free-form nutrition description)" });
  }

  try {
    const userMessage = rideDuration
      ? `Ride duration: ${rideDuration} minutes.\n\nFueling description: ${text}`
      : `Fueling description: ${text}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: NUTRITION_PARSE_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = response.content[0].text;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try extracting JSON from markdown code fences
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1].trim());
      } else {
        console.error("Nutrition parse response:", raw);
        return res.status(500).json({ error: "Failed to parse AI nutrition response" });
      }
    }

    return res.status(200).json({
      parsed: {
        items: parsed.items || [],
        totals: parsed.totals || { carbs: 0, protein: 0, fat: 0, calories: 0 },
      },
      followUpQuestions: parsed.followUpQuestions || [],
    });
  } catch (err) {
    console.error("Nutrition parse error:", err);
    const msg = err?.status === 401
      ? "Invalid ANTHROPIC_API_KEY"
      : err?.message || "Failed to parse nutrition";
    return res.status(500).json({ error: msg });
  }
}
