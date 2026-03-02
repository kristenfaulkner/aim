import { verifySession, cors } from "../_lib/auth.js";
import Anthropic from "@anthropic-ai/sdk";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
  maxDuration: 120,
};

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CLASSIFICATION_PROMPT = `You are a document classifier for a health & fitness platform. Examine this document and reply with exactly one word:

- "blood_panel" if it is a blood test, laboratory result, lab panel, CBC, metabolic panel, or similar clinical lab report
- "body_scan" if it is a DEXA scan, InBody, Fit3D, BodPod, body composition report, or similar body measurement report
- "unknown" for anything else

Reply with ONLY one of those three words. No explanation, no punctuation.`;

/**
 * POST /api/upload/classify-and-process
 * Classify a PDF/image file via Claude AI, then route to the appropriate extraction endpoint.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const { fileBase64, mediaType, fileName } = req.body;
  if (!fileBase64 || !mediaType) {
    return res.status(400).json({ error: "Missing file data (fileBase64 and mediaType required)" });
  }

  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!ALLOWED_TYPES.includes(mediaType)) {
    return res.status(400).json({ error: "Unsupported file type. Please upload a PDF, JPG, PNG, or WebP." });
  }

  try {
    // Phase 1: Classify the document
    const contentBlock = mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: mediaType, data: fileBase64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: fileBase64 } };

    const classifyResponse = await anthropic.messages.create({
      model: "claude-haiku-3-5-20241022",
      max_tokens: 10,
      system: CLASSIFICATION_PROMPT,
      messages: [{
        role: "user",
        content: [
          contentBlock,
          { type: "text", text: "Classify this document." },
        ],
      }],
    });

    const classification = classifyResponse.content[0].text.trim().toLowerCase();
    console.log("File classification:", classification, "for:", fileName);

    if (classification !== "blood_panel" && classification !== "body_scan") {
      return res.status(200).json({
        classification: "unknown",
        error: "Could not identify this document as a blood panel or body scan. Please upload it to the appropriate section in Health Lab.",
      });
    }

    // Phase 2: Delegate to the correct extraction endpoint
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    const targetPath = classification === "blood_panel"
      ? "/api/health/upload"
      : "/api/health/dexa-upload";

    const delegateRes = await fetch(`${baseUrl}${targetPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.authorization,
      },
      body: JSON.stringify({ fileBase64, mediaType, fileName }),
    });

    let delegateData;
    try {
      delegateData = await delegateRes.json();
    } catch {
      return res.status(500).json({ error: `Extraction failed (${delegateRes.status})`, classification });
    }

    if (!delegateRes.ok) {
      return res.status(delegateRes.status).json({ ...delegateData, classification });
    }

    return res.status(200).json({ classification, ...delegateData });
  } catch (err) {
    console.error("Classify-and-process error:", err);
    return res.status(500).json({ error: err.message || "Classification failed" });
  }
}
