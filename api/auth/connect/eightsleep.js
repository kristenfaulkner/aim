import { supabaseAdmin } from "../../_lib/supabase.js";
import { verifySession, cors } from "../../_lib/auth.js";
import { authenticateEightSleep } from "../../_lib/eightsleep.js";
import { encrypt } from "../../_lib/crypto.js";

/**
 * POST /api/auth/connect/eightsleep
 * Connect Eight Sleep using email/password credentials.
 * Unlike OAuth providers, Eight Sleep uses direct credential auth.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const auth = await authenticateEightSleep(email, password);

    await supabaseAdmin.from("integrations").upsert({
      user_id: session.userId,
      provider: "eightsleep",
      access_token: auth.accessToken,
      refresh_token: auth.userId, // Store Eight Sleep userId for convenience
      token_expires_at: new Date(Date.now() + auth.expiresIn * 1000).toISOString(),
      provider_user_id: auth.userId,
      scopes: ["sleep", "temperature", "presence"],
      is_active: true,
      sync_status: "pending",
      metadata: { email: encrypt(email), password: encrypt(password), encrypted: true }, // Encrypted; needed for token re-auth
    }, { onConflict: "user_id,provider" });

    return res.status(200).json({ ok: true, provider: "eightsleep" });
  } catch (err) {
    console.error("Eight Sleep connect error:", err.message);
    const msg = err.message.includes("authentication failed")
      ? "Invalid Eight Sleep credentials. Please check your email and password."
      : err.message;
    return res.status(401).json({ error: msg });
  }
}
