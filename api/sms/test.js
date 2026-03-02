import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import { sendWorkoutSMS } from "./send.js";

/**
 * POST /api/sms/test — Test SMS by sending a workout text for the most recent activity.
 * Requires authentication. For development/testing only.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Get the most recent activity
    const { data: activity, error: actErr } = await supabaseAdmin
      .from("activities")
      .select("id, name, started_at")
      .eq("user_id", session.userId)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (actErr || !activity) {
      return res.status(404).json({ error: "No activities found. Sync Strava first." });
    }

    // Check SMS settings
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("phone_number, sms_opt_in")
      .eq("id", session.userId)
      .single();

    if (!profile?.phone_number) {
      return res.status(400).json({ error: "No phone number set. Go to Settings → Notifications." });
    }
    if (!profile?.sms_opt_in) {
      return res.status(400).json({ error: "SMS not enabled. Go to Settings → Notifications and enable SMS Coaching." });
    }

    // Send the SMS
    const result = await sendWorkoutSMS(session.userId, activity.id);

    return res.status(200).json({
      sent: !!result,
      activity: { id: activity.id, name: activity.name, date: activity.started_at },
      sms: result || { skipped: true },
    });
  } catch (err) {
    console.error("SMS test error:", err);
    return res.status(500).json({ error: err.message || "Test failed" });
  }
}
