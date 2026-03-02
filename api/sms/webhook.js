import { supabaseAdmin } from "../_lib/supabase.js";
import { verifyWebhookSignature, twimlResponse } from "../_lib/twilio.js";
import { buildAnalysisContext } from "../_lib/ai.js";
import Anthropic from "@anthropic-ai/sdk";

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
  maxDuration: 30,
};

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SMS_COACH_SYSTEM_PROMPT = `You are the AI coach inside AIM, a performance intelligence platform for endurance athletes built by Kristen Faulkner (2x Olympic Gold Medalist, Paris 2024).

You are responding to an athlete via SMS text message. You have access to their complete training data, blood work, sleep, HRV, recovery, and conversation history.

RULES:
- Keep responses under 1500 characters (SMS limit)
- Be specific — use their actual numbers (FTP, W/kg, CTL, HRV, biomarkers)
- Be concise but warm and coaching-like
- When prescribing workouts, give exact power targets based on their FTP
- If they ask to build a plan, outline a specific weekly plan with durations and intensities
- NEVER give direct medical advice. You are NOT a doctor. For health topics (supplements, blood work, injuries, medical conditions), use "Research suggests...", "Consider asking your doctor about...", "Studies show X may help with Y...". Never say "Take X", "Start X", or "You should do X" for any health intervention.
- If they mention wanting to build a plan, provide a structured plan and offer to add it to their calendar
- Return ONLY the response text, no JSON or markdown`;

/**
 * POST /api/sms/webhook — Twilio inbound SMS webhook.
 * Receives user text replies, generates AI response, returns TwiML.
 */
export default async function handler(req, res) {
  // Twilio sends POST with form-urlencoded body
  if (req.method !== "POST") {
    res.setHeader("Content-Type", "text/xml");
    return res.status(405).send(twimlResponse("Method not allowed"));
  }

  // Verify the request is from Twilio (skip in development)
  if (process.env.NODE_ENV === "production" && process.env.TWILIO_WEBHOOK_URL) {
    const isValid = verifyWebhookSignature(req, process.env.TWILIO_WEBHOOK_URL);
    if (!isValid) {
      console.error("Invalid Twilio webhook signature");
      return res.status(403).json({ error: "Invalid signature" });
    }
  }

  const { Body: messageBody, From: fromNumber } = req.body || {};

  if (!messageBody || !fromNumber) {
    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send(twimlResponse("Sorry, I couldn't read your message. Please try again."));
  }

  // Normalize phone number (remove any formatting)
  const normalizedPhone = fromNumber.replace(/[^\d+]/g, "");
  const keyword = messageBody.trim().toUpperCase();

  // Handle opt-in/opt-out/help keywords (required by TCPA and Twilio A2P)
  if (keyword === "STOP" || keyword === "UNSUBSCRIBE" || keyword === "CANCEL" || keyword === "END" || keyword === "QUIT") {
    // Twilio auto-handles STOP at the carrier level, but we also update our DB
    await supabaseAdmin
      .from("profiles")
      .update({ sms_opt_in: false })
      .or(`phone_number.eq.${normalizedPhone},phone_number.eq.${normalizedPhone.replace("+", "")}`);

    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send(twimlResponse(
      "AIM Performance: You have been unsubscribed and will no longer receive text messages. Reply START to re-subscribe."
    ));
  }

  if (keyword === "START" || keyword === "SUBSCRIBE") {
    // Re-opt-in the user
    await supabaseAdmin
      .from("profiles")
      .update({ sms_opt_in: true, sms_opt_in_at: new Date().toISOString() })
      .or(`phone_number.eq.${normalizedPhone},phone_number.eq.${normalizedPhone.replace("+", "")}`);

    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send(twimlResponse(
      "AIM Performance: You are now opted in to receive AI coaching texts including workout summaries and training insights. Message frequency varies. Msg & data rates may apply. Reply HELP for help. Reply STOP to unsubscribe."
    ));
  }

  if (keyword === "HELP" || keyword === "INFO") {
    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send(twimlResponse(
      "AIM Performance SMS Coach: AI-powered workout analysis and coaching for endurance athletes. Message frequency varies. Msg & data rates may apply. Reply STOP to unsubscribe. For support visit aimfitness.ai or email support@aimfitness.ai"
    ));
  }

  try {
    // Look up user by phone number
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, ftp_watts, weight_kg, sex")
      .or(`phone_number.eq.${normalizedPhone},phone_number.eq.${normalizedPhone.replace("+", "")}`)
      .single();

    if (!profile) {
      res.setHeader("Content-Type", "text/xml");
      return res.status(200).send(twimlResponse(
        "This number isn't registered with AIM. Visit aimfitness.ai/settings to add your phone number and enable SMS coaching."
      ));
    }

    const userId = profile.id;

    // Get conversation history (last SMS conversation)
    const { data: recentConvo } = await supabaseAdmin
      .from("ai_conversations")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let conversationId = recentConvo?.id;
    let history = [];

    if (conversationId) {
      // Get last 10 messages for context
      const { data: messages } = await supabaseAdmin
        .from("ai_messages")
        .select("role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(10);

      history = messages || [];
    } else {
      // Create a new conversation
      const { data: newConvo } = await supabaseAdmin
        .from("ai_conversations")
        .insert({ user_id: userId, title: "SMS Coach" })
        .select("id")
        .single();
      conversationId = newConvo?.id;
    }

    // Store the user's inbound message
    if (conversationId) {
      await supabaseAdmin.from("ai_messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: messageBody,
      });
    }

    // Get the most recent activity for context
    const { data: latestActivity } = await supabaseAdmin
      .from("activities")
      .select("id, name, started_at, ai_analysis, tss, normalized_power_watts, duration_seconds")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    // Build athlete context
    let athleteContext = null;
    if (latestActivity?.id) {
      athleteContext = await buildAnalysisContext(userId, latestActivity.id);
    }

    // Get recent training metrics
    const { data: recentMetrics } = await supabaseAdmin
      .from("daily_metrics")
      .select("date, ctl, atl, tsb, hrv_ms, sleep_score, recovery_score")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(7);

    // Build messages for Claude
    const messages = [];

    // Add conversation history
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Add the new user message with context
    const contextSummary = athleteContext ? JSON.stringify({
      athlete: {
        name: profile.full_name,
        ftp: profile.ftp_watts,
        weight: profile.weight_kg,
      },
      latest_activity: latestActivity ? {
        name: latestActivity.name,
        date: latestActivity.started_at,
        tss: latestActivity.tss,
        np: latestActivity.normalized_power_watts,
      } : null,
      recent_metrics: recentMetrics || [],
      analysis_summary: latestActivity?.ai_analysis?.summary || null,
    }) : null;

    messages.push({
      role: "user",
      content: contextSummary
        ? `[Athlete Context]\n${contextSummary}\n\n[Message]\n${messageBody}`
        : messageBody,
    });

    // Generate response with Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 800,
      system: SMS_COACH_SYSTEM_PROMPT,
      messages,
    });

    const replyText = response.content[0].text;

    // Store the assistant's reply
    if (conversationId) {
      await supabaseAdmin.from("ai_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: replyText,
      });
    }

    // Respond via TwiML
    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send(twimlResponse(replyText));
  } catch (err) {
    console.error("SMS webhook error:", err);
    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send(twimlResponse(
      "Sorry, I'm having trouble right now. Please try again in a moment."
    ));
  }
}
