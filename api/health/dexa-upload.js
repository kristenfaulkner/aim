import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import Anthropic from "@anthropic-ai/sdk";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
  maxDuration: 60,
};

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_PROMPT = `You are a DEXA scan extraction engine for AIM, a performance intelligence platform for endurance athletes.

You will receive a DEXA scan report (PDF or image). Extract all body composition values you can find.

## REQUIRED OUTPUT FORMAT

Return valid JSON with this exact structure:
{
  "scan_date": "YYYY-MM-DD or null if not found",
  "facility_name": "Name of facility/clinic or null",
  "total_body_fat_pct": 15.2,
  "lean_mass_kg": 58.4,
  "fat_mass_kg": 10.3,
  "bone_mineral_density": 1.25,
  "visceral_fat_area_cm2": 42.0,
  "regional_data": {
    "left_arm": { "fat_pct": 14.2, "lean_mass_kg": 3.1, "fat_mass_kg": 0.5 },
    "right_arm": { "fat_pct": 13.8, "lean_mass_kg": 3.2, "fat_mass_kg": 0.5 },
    "left_leg": { "fat_pct": 18.1, "lean_mass_kg": 8.9, "fat_mass_kg": 1.9 },
    "right_leg": { "fat_pct": 17.5, "lean_mass_kg": 9.1, "fat_mass_kg": 1.8 },
    "trunk": { "fat_pct": 12.5, "lean_mass_kg": 27.3, "fat_mass_kg": 3.9 },
    "android": { "fat_pct": 10.2 },
    "gynoid": { "fat_pct": 20.1 }
  },
  "total_mass_kg": 70.1,
  "bone_mineral_content_g": 2800,
  "t_score": -0.5,
  "z_score": 0.2
}

## RULES
- Extract EVERY value visible on the report.
- Values must be numeric (no text like "see note").
- If a value is reported in lbs, convert to kg (divide by 2.2046).
- If a value is reported in g, convert to kg (divide by 1000) for mass fields.
- For regional_data, include whatever regions are available. Common regions: left_arm, right_arm, left_leg, right_leg, trunk, android, gynoid, head.
- Only include fields that have actual values — omit any field that is null or not present.
- If you cannot determine the scan date, set to null.
- Return ONLY valid JSON. No markdown, no explanation, no code fences.`;

/**
 * POST /api/health/dexa-upload
 * Upload a DEXA scan file (PDF or image) and extract body composition data via Claude AI.
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

  const { fileBase64, mediaType, fileName, scanDate } = req.body;
  if (!fileBase64 || !mediaType) {
    return res.status(400).json({ error: "Missing file data (fileBase64 and mediaType required)" });
  }

  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!ALLOWED_TYPES.includes(mediaType)) {
    return res.status(400).json({ error: "Unsupported file type. Please upload a PDF, JPG, PNG, or WebP." });
  }

  try {
    // 1. Send file to Claude for DEXA data extraction
    console.log("DEXA upload: starting extraction, mediaType:", mediaType, "base64 length:", fileBase64.length);
    const contentBlock = mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: mediaType, data: fileBase64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: fileBase64 } };

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4000,
      system: EXTRACTION_PROMPT,
      messages: [{
        role: "user",
        content: [
          contentBlock,
          { type: "text", text: "Extract all body composition values from this DEXA scan report." },
        ],
      }],
    });
    console.log("DEXA upload: Claude responded, stop_reason:", response.stop_reason);

    const text = response.content[0].text;

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1].trim());
      } else {
        console.error("Claude DEXA extraction response:", text);
        return res.status(500).json({ error: "Failed to parse AI extraction results" });
      }
    }
    console.log("DEXA upload: parsed extraction, keys:", Object.keys(parsed));

    // 2. Upload original file to Supabase Storage
    let pdfUrl = null;
    try {
      const safeName = (fileName || "dexa-scan").replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${session.userId}/dexa-scans/${Date.now()}-${safeName}`;
      const fileBuffer = Buffer.from(fileBase64, "base64");

      const { error: uploadErr } = await supabaseAdmin.storage
        .from("health-files")
        .upload(filePath, fileBuffer, { contentType: mediaType, upsert: false });

      if (!uploadErr) {
        pdfUrl = filePath;
      }
    } catch (storageErr) {
      console.error("Storage upload error (non-fatal):", storageErr.message);
    }

    // 3. Build database row
    const parsedDate = parsed.scan_date && parsed.scan_date !== "null" ? parsed.scan_date : null;
    const dbRow = {
      user_id: session.userId,
      scan_date: scanDate || parsedDate || new Date().toISOString().split("T")[0],
      facility_name: parsed.facility_name || null,
      pdf_url: pdfUrl,
      total_body_fat_pct: parsed.total_body_fat_pct ?? null,
      lean_mass_kg: parsed.lean_mass_kg ?? null,
      fat_mass_kg: parsed.fat_mass_kg ?? null,
      bone_mineral_density: parsed.bone_mineral_density ?? null,
      visceral_fat_area_cm2: parsed.visceral_fat_area_cm2 ?? null,
      regional_data: parsed.regional_data || null,
    };

    // 4. Insert into dexa_scans
    console.log("DEXA upload: inserting to DB, scan_date:", dbRow.scan_date, "body_fat:", dbRow.total_body_fat_pct);
    const { data: scan, error: insertErr } = await supabaseAdmin
      .from("dexa_scans")
      .insert(dbRow)
      .select()
      .single();

    if (insertErr) {
      console.error("DEXA insert error:", JSON.stringify(insertErr));
      return res.status(500).json({ error: insertErr.message || "Database insert failed" });
    }

    console.log("DEXA upload: success, scan id:", scan?.id);

    // 5. Fire-and-forget AI analysis
    generateDexaAnalysis(session.userId, scan.id).catch(err =>
      console.error("DEXA AI analysis error:", err.message)
    );

    return res.status(200).json({ scan });
  } catch (err) {
    console.error("DEXA upload error:", err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
}

/**
 * Generate AI analysis for a DEXA scan, cross-referencing with training and power data.
 */
async function generateDexaAnalysis(userId, scanId) {
  const [scanResult, allScansResult, profileResult, metricsResult, powerResult] = await Promise.allSettled([
    supabaseAdmin.from("dexa_scans").select("*").eq("id", scanId).single(),
    supabaseAdmin.from("dexa_scans").select("scan_date, total_body_fat_pct, lean_mass_kg, fat_mass_kg, bone_mineral_density, visceral_fat_area_cm2")
      .eq("user_id", userId).order("scan_date", { ascending: true }),
    supabaseAdmin.from("profiles").select("full_name, sex, ftp_watts, weight_kg, weekly_hours").eq("id", userId).single(),
    supabaseAdmin.from("daily_metrics").select("date, ctl, atl, tsb")
      .eq("user_id", userId).order("date", { ascending: false }).limit(30),
    supabaseAdmin.from("power_profiles").select("duration_seconds, watts, watts_per_kg, recorded_at")
      .eq("user_id", userId).order("recorded_at", { ascending: false }).limit(20),
  ]);

  const getData = (r) => r.status === "fulfilled" ? r.value.data : null;
  const scan = getData(scanResult);
  if (!scan) return;

  const profile = getData(profileResult) || {};
  const context = {
    current_scan: scan,
    previous_scans: (getData(allScansResult) || []).filter(s => s.scan_date !== scan.scan_date),
    athlete: profile,
    recent_training: getData(metricsResult) || [],
    power_profile: getData(powerResult) || [],
    computed: {},
  };

  // Compute W/kg from lean mass if FTP available
  if (profile.ftp_watts && scan.lean_mass_kg) {
    context.computed.watts_per_kg_lean = (profile.ftp_watts / scan.lean_mass_kg).toFixed(2);
  }
  if (profile.ftp_watts && scan.lean_mass_kg && scan.fat_mass_kg) {
    context.computed.watts_per_kg_total = (profile.ftp_watts / (scan.lean_mass_kg + scan.fat_mass_kg)).toFixed(2);
  }

  const analysisResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 3000,
    system: `You are the AI analysis engine for AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist).

Analyze this DEXA scan for an endurance athlete. Cross-reference with training data, power profile, and previous scans when available.

Key athlete-specific analysis points:
- W/kg from lean mass (more accurate than total body weight) — provided in computed.watts_per_kg_lean
- L/R limb imbalances from regional_data (flag differences >5%)
- Visceral fat (athletes should be <100 cm2, ideally <50)
- Bone mineral density (weight-bearing athletes should have T-score > -1.0; cyclists are at higher risk for low BMD due to non-weight-bearing nature of cycling)
- Body fat % context (elite female cyclists: 15-20%, elite male: 6-12%)
- Lean mass trends — gaining/losing muscle relative to training load
- Android/gynoid fat ratio for metabolic health

CRITICAL: You are NOT a doctor. NEVER give direct medical advice. Instead:
- Use "Research suggests...", "Studies show...", "Some sports medicine practitioners recommend..."
- Use "Consider discussing with your doctor..."
- NEVER say "Take X", "Start X protocol", "You should..."

Return valid JSON:
{
  "summary": "2-3 sentence overview of the DEXA results for an athlete",
  "insights": [
    {
      "type": "positive|warning|action|info",
      "title": "Short title with key number",
      "body": "Detailed explanation connecting body composition to performance."
    }
  ],
  "actionItems": [
    "Non-prescriptive suggestion framed as 'Consider...' or 'Research suggests...'"
  ]
}`,
    messages: [{ role: "user", content: JSON.stringify(context) }],
  });

  const analysisText = analysisResponse.content[0].text;
  await supabaseAdmin.from("dexa_scans").update({
    ai_analysis: analysisText,
  }).eq("id", scanId);
}
