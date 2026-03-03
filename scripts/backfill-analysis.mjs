#!/usr/bin/env node
/**
 * One-off script to backfill AI analysis for activities that don't have it.
 * Usage: ANTHROPIC_API_KEY=sk-... node scripts/backfill-analysis.mjs
 */
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const SUPABASE_URL = "https://pzdnkykhgdeotzodjyxj.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY or ANTHROPIC_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Find all activities without AI analysis
const { data: activities, error } = await supabase
  .from("activities")
  .select("id, user_id, name, started_at")
  .is("ai_analysis", null)
  .order("started_at", { ascending: false });

if (error) {
  console.error("Query error:", error.message);
  process.exit(1);
}

console.log(`Found ${activities.length} activities without AI analysis\n`);

if (activities.length === 0) {
  console.log("Nothing to backfill!");
  process.exit(0);
}

// Import the analyzeActivity function dynamically
const { analyzeActivity } = await import("../api/_lib/ai.js");

let processed = 0;
let failed = 0;

for (const act of activities) {
  const label = `${act.name || "Untitled"} (${new Date(act.started_at).toLocaleDateString()})`;
  process.stdout.write(`[${processed + failed + 1}/${activities.length}] ${label}...`);
  try {
    await analyzeActivity(act.user_id, act.id);
    processed++;
    console.log(" ✓");
  } catch (err) {
    failed++;
    console.log(` ✗ ${err.message}`);
    // Stop early on credit/auth errors — no point retrying
    if (err.message?.includes("credit balance") || err.message?.includes("authentication")) {
      console.log("\nStopping: API credit or auth error. Top up at console.anthropic.com");
      break;
    }
  }
}

console.log(`\nDone! Processed: ${processed}, Failed: ${failed}`);
