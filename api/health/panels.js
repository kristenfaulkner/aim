import { verifySession, cors } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabase.js";

/**
 * GET  /api/health/panels          — List all blood panels for the user
 * DELETE /api/health/panels?id=xxx — Delete a specific blood panel
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("blood_panels")
      .select("*")
      .eq("user_id", session.userId)
      .order("test_date", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ panels: data || [] });
  }

  if (req.method === "DELETE") {
    const panelId = req.query.id || req.body?.id;
    if (!panelId) return res.status(400).json({ error: "Missing panel id" });

    // Verify ownership and get file path
    const { data: panel } = await supabaseAdmin
      .from("blood_panels")
      .select("id, pdf_url")
      .eq("id", panelId)
      .eq("user_id", session.userId)
      .single();

    if (!panel) return res.status(404).json({ error: "Panel not found" });

    // Delete file from storage if exists
    if (panel.pdf_url) {
      await supabaseAdmin.storage
        .from("health-files")
        .remove([panel.pdf_url])
        .catch(() => {}); // Non-fatal
    }

    // Delete from database
    const { error } = await supabaseAdmin
      .from("blood_panels")
      .delete()
      .eq("id", panelId)
      .eq("user_id", session.userId);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
