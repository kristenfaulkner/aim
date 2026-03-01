import { supabaseAdmin } from "./supabase.js";

export async function verifySession(req) {
  // Accept token from Authorization header or ?token= query param (for OAuth redirects)
  const auth = req.headers["authorization"];
  const raw = auth?.startsWith("Bearer ") ? auth.slice(7) : req.query?.token;
  if (!raw) return null;

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(raw);
    if (error || !user) return null;
    return { userId: user.id };
  } catch {
    return null;
  }
}

export function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}
