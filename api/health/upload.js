import crypto from "crypto";
import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import Anthropic from "@anthropic-ai/sdk";
import { trackTokenUsage } from "../_lib/token-tracking.js";

// Allow larger request bodies (base64 files) and longer execution for Claude extraction
export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
  maxDuration: 60,
};

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_PROMPT = `You are a clinical lab result extraction engine for AIM, a performance intelligence platform for endurance athletes.

You will receive a lab report (PDF or image). Extract ALL biomarker values you can find.

## REQUIRED OUTPUT FORMAT

Return valid JSON with this exact structure:
{
  "test_date": "YYYY-MM-DD or null if not found",
  "lab_name": "Name of laboratory or null",
  "biomarkers": {
    "ferritin_ng_ml": { "value": 45.2, "unit": "ng/mL", "reference_range": "12-150", "flag": "normal" },
    ...only include biomarkers that are present in the report
  },
  "other_results": [
    { "name": "WBC", "value": 5.8, "unit": "10^3/uL", "reference_range": "4.5-11.0", "flag": "normal" },
    ...any results not matching the known columns below
  ]
}

## KNOWN BIOMARKER COLUMNS (use these exact keys when the biomarker matches):
- ferritin_ng_ml (Ferritin, ng/mL)
- hemoglobin_g_dl (Hemoglobin, g/dL)
- iron_mcg_dl (Iron/Serum Iron, mcg/dL)
- tibc_mcg_dl (TIBC/Total Iron Binding Capacity, mcg/dL)
- transferrin_sat_pct (Transferrin Saturation, %)
- vitamin_d_ng_ml (Vitamin D / 25-OH Vitamin D, ng/mL)
- vitamin_b12_pg_ml (Vitamin B12, pg/mL)
- folate_ng_ml (Folate/Folic Acid, ng/mL)
- tsh_miu_l (TSH, mIU/L)
- free_t3_pg_ml (Free T3, pg/mL)
- free_t4_ng_dl (Free T4, ng/dL)
- testosterone_ng_dl (Total Testosterone, ng/dL)
- cortisol_mcg_dl (Cortisol, mcg/dL)
- crp_mg_l (CRP / hs-CRP, mg/L)
- hba1c_pct (HbA1c / Hemoglobin A1c, %)
- total_cholesterol_mg_dl (Total Cholesterol, mg/dL)
- ldl_mg_dl (LDL Cholesterol, mg/dL)
- hdl_mg_dl (HDL Cholesterol, mg/dL)
- triglycerides_mg_dl (Triglycerides, mg/dL)
- creatinine_mg_dl (Creatinine, mg/dL)
- bun_mg_dl (BUN / Blood Urea Nitrogen, mg/dL)
- alt_u_l (ALT / SGPT, U/L)
- ast_u_l (AST / SGOT, U/L)
- magnesium_mg_dl (Magnesium, mg/dL)
- zinc_mcg_dl (Zinc, mcg/dL)

## UNIT CONVERSION RULES
- If the lab reports in different units, convert to the standard unit listed above.
- For vitamin D: if reported in nmol/L, divide by 2.496 to get ng/mL.
- For testosterone: if reported in nmol/L, multiply by 28.84 to get ng/dL.
- For cholesterol: if reported in mmol/L, multiply by 38.67 to get mg/dL.
- For triglycerides: if reported in mmol/L, multiply by 88.57 to get mg/dL.
- For glucose/HbA1c: if reported in mmol/mol (IFCC), convert using formula: % = (mmol/mol / 10.929) + 2.15
- For iron: if reported in umol/L, multiply by 5.585 to get mcg/dL.

## RULES
- Extract EVERY value visible on the report.
- Values must be numeric (no text like "see note").
- For "flag", use: "normal", "high", "low", or "critical" based on the lab's own reference range.
- If a value does not match any of the 25 known columns, put it in "other_results".
- If you cannot determine the test date, set to null.
- Return ONLY valid JSON. No markdown, no explanation, no code fences.`;

const KNOWN_COLUMNS = [
  "ferritin_ng_ml", "hemoglobin_g_dl", "iron_mcg_dl", "tibc_mcg_dl",
  "transferrin_sat_pct", "vitamin_d_ng_ml", "vitamin_b12_pg_ml", "folate_ng_ml",
  "tsh_miu_l", "free_t3_pg_ml", "free_t4_ng_dl", "testosterone_ng_dl",
  "cortisol_mcg_dl", "crp_mg_l", "hba1c_pct", "total_cholesterol_mg_dl",
  "ldl_mg_dl", "hdl_mg_dl", "triglycerides_mg_dl", "creatinine_mg_dl",
  "bun_mg_dl", "alt_u_l", "ast_u_l", "magnesium_mg_dl", "zinc_mcg_dl",
];

/**
 * POST /api/health/upload
 * Upload a blood panel file (PDF or image) and extract biomarkers via Claude AI.
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

  const { fileBase64, mediaType, fileName, testDate } = req.body;
  if (!fileBase64 || !mediaType) {
    return res.status(400).json({ error: "Missing file data (fileBase64 and mediaType required)" });
  }

  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!ALLOWED_TYPES.includes(mediaType)) {
    return res.status(400).json({ error: "Unsupported file type. Please upload a PDF, JPG, PNG, or WebP." });
  }

  // Check for duplicate file (hash the content)
  const fileHash = crypto.createHash("sha256").update(fileBase64).digest("hex");

  const { data: existingPanels } = await supabaseAdmin
    .from("blood_panels")
    .select("id, test_date, all_results")
    .eq("user_id", session.userId);

  const duplicate = (existingPanels || []).find(
    p => p.all_results?.file_hash === fileHash
  );

  if (duplicate) {
    return res.status(409).json({
      error: "This file has already been uploaded",
      duplicate: true,
      existing_panel_id: duplicate.id,
      existing_test_date: duplicate.test_date,
    });
  }

  try {
    // 1. Send file to Claude for biomarker extraction
    const contentBlock = mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: mediaType, data: fileBase64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: fileBase64 } };

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: EXTRACTION_PROMPT,
      messages: [{
        role: "user",
        content: [
          contentBlock,
          { type: "text", text: "Extract all biomarker values from this lab report." },
        ],
      }],
    });
    trackTokenUsage(session.userId, "blood_panel_extraction", "claude-sonnet-4-6", response.usage);

    const text = response.content[0].text;

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1].trim());
      } else {
        console.error("Claude extraction response:", text);
        return res.status(500).json({ error: "Failed to parse AI extraction results" });
      }
    }

    // 2. Upload original file to Supabase Storage
    let pdfUrl = null;
    try {
      const safeName = (fileName || "lab-report").replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${session.userId}/blood-panels/${Date.now()}-${safeName}`;
      const fileBuffer = Buffer.from(fileBase64, "base64");

      const { error: uploadErr } = await supabaseAdmin.storage
        .from("health-files")
        .upload(filePath, fileBuffer, { contentType: mediaType, upsert: false });

      if (!uploadErr) {
        pdfUrl = filePath; // Store path, not public URL (bucket is private)
      }
    } catch (storageErr) {
      console.error("Storage upload error (non-fatal):", storageErr.message);
    }

    // 3. Build database row
    const biomarkers = parsed.biomarkers || {};
    const otherResults = parsed.other_results || [];

    const dbRow = {
      user_id: session.userId,
      test_date: testDate || parsed.test_date || new Date().toISOString().split("T")[0],
      lab_name: parsed.lab_name || null,
      pdf_url: pdfUrl,
      all_results: { biomarkers, other_results: otherResults, file_hash: fileHash },
    };

    // Map extracted biomarkers to specific columns
    for (const col of KNOWN_COLUMNS) {
      if (biomarkers[col]?.value != null) {
        dbRow[col] = biomarkers[col].value;
      }
    }

    // 4. Insert into blood_panels
    const { data: panel, error: insertErr } = await supabaseAdmin
      .from("blood_panels")
      .insert(dbRow)
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return res.status(500).json({ error: insertErr.message });
    }

    // 5. Fire-and-forget AI analysis
    generatePanelAnalysis(session.userId, panel.id).catch(err =>
      console.error("Panel AI analysis error:", err.message)
    );

    return res.status(200).json({
      panel,
      extractedCount: Object.keys(biomarkers).length,
      otherCount: otherResults.length,
    });
  } catch (err) {
    console.error("Blood panel upload error:", err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
}

/**
 * Generate AI analysis for a blood panel, cross-referencing with training data.
 */
async function generatePanelAnalysis(userId, panelId) {
  const [panelResult, allPanelsResult, profileResult, metricsResult] = await Promise.allSettled([
    supabaseAdmin.from("blood_panels").select("*").eq("id", panelId).single(),
    supabaseAdmin.from("blood_panels").select("test_date, ferritin_ng_ml, hemoglobin_g_dl, vitamin_d_ng_ml, testosterone_ng_dl, cortisol_mcg_dl, crp_mg_l, tsh_miu_l, hba1c_pct")
      .eq("user_id", userId).order("test_date", { ascending: true }),
    supabaseAdmin.from("profiles").select("full_name, sex, ftp_watts, weight_kg, weekly_hours").eq("id", userId).single(),
    supabaseAdmin.from("daily_metrics").select("date, ctl, atl, tsb, hrv_ms, sleep_score, recovery_score")
      .eq("user_id", userId).order("date", { ascending: false }).limit(30),
  ]);

  const getData = (r) => r.status === "fulfilled" ? r.value.data : null;
  const panel = getData(panelResult);
  if (!panel) return;

  const context = {
    current_panel: panel,
    previous_panels: (getData(allPanelsResult) || []).filter(p => p.test_date !== panel.test_date),
    athlete: getData(profileResult) || {},
    recent_training: getData(metricsResult) || [],
  };

  const analysisResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: `You are the AI analysis engine for AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist).

Analyze this blood panel using ATHLETE-OPTIMAL ranges (not standard clinical ranges). Cross-reference with training data and previous panels when available.

CRITICAL: You are NOT a doctor. NEVER give direct medical advice, prescribe supplements, or tell the athlete to start/stop/change any health intervention. Instead:
- Use "Research suggests...", "Studies show...", "Some sports medicine practitioners recommend..."
- Use "Consider discussing with your doctor...", "Ask your physician about...", "It may be worth exploring..."
- NEVER say "Take X", "Supplement with X", "Start X protocol", "Increase your dose of X"
- Always recommend consulting a physician or sports medicine doctor for any health-related action

Return valid JSON:
{
  "summary": "2-3 sentence overview of the panel results for an athlete",
  "insights": [
    {
      "type": "positive|warning|action|info",
      "title": "Short title with key number",
      "body": "Detailed explanation connecting biomarkers to performance. Reference specific numbers and trends.",
      "biomarkers": ["ferritin", "hemoglobin"]
    }
  ],
  // ORDER insights by impact — most critical or surprising finding first, always.

  "actionItems": [
    "Science-based suggestion framed as 'Consider discussing X with your doctor' or 'Research suggests X may help'",
    "Another suggestion using non-prescriptive language"
  ]
}`,
    messages: [{ role: "user", content: JSON.stringify(context) }],
  });
  trackTokenUsage(userId, "blood_panel_analysis", "claude-sonnet-4-6", analysisResponse.usage);

  const analysisText = analysisResponse.content[0].text;
  await supabaseAdmin.from("blood_panels").update({
    ai_analysis: analysisText,
    ai_analysis_generated_at: new Date().toISOString(),
  }).eq("id", panelId);
}
