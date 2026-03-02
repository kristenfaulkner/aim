import { supabaseAdmin } from "../_lib/supabase.js";
import { verifySession, cors } from "../_lib/auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { confirmation } = req.body || {};
  if (confirmation !== "DELETE") {
    return res.status(400).json({ error: "You must type DELETE to confirm account deletion" });
  }

  const userId = session.userId;

  // 1. Revoke all integration tokens (best-effort)
  const { data: integrations } = await supabaseAdmin
    .from("integrations")
    .select("access_token, provider")
    .eq("user_id", userId);

  for (const integration of (integrations || [])) {
    try {
      if (integration.provider === "strava" && integration.access_token) {
        await fetch("https://www.strava.com/oauth/deauthorize", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ access_token: integration.access_token }),
        });
      }
    } catch {
      // Continue even if revocation fails
    }
  }

  // 2. Delete files from storage buckets
  for (const bucket of ["health-files", "import-files"]) {
    const { data: files } = await supabaseAdmin.storage
      .from(bucket)
      .list(userId);
    if (files?.length) {
      await supabaseAdmin.storage
        .from(bucket)
        .remove(files.map(f => `${userId}/${f.name}`));
    }
  }

  // 3. Mark as deleted with 30-day grace period
  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + 30);

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      is_deleted: true,
      account_deletion_requested_at: new Date().toISOString(),
      account_deletion_scheduled_for: scheduledFor.toISOString().split("T")[0],
    })
    .eq("id", userId);

  if (error) return res.status(500).json({ error: error.message });

  // 4. Sign out the user by deleting their auth account
  // This cascades to all tables via ON DELETE CASCADE
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) {
    console.error("Failed to delete auth user:", authError);
    return res.status(500).json({ error: "Account deletion initiated but auth cleanup failed. Contact support." });
  }

  return res.status(200).json({ ok: true, message: "Your account and all associated data have been permanently deleted." });
}
