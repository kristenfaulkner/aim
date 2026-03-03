/**
 * GET /api/tags/dictionary
 * Returns the canonical tag dictionary for the frontend.
 */
import { verifySession, cors } from "../_lib/auth.js";
import { getTagDictionary } from "../_lib/tags.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  return res.status(200).json(getTagDictionary());
}
