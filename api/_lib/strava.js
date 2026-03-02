import { supabaseAdmin } from "./supabase.js";

/**
 * Get a valid Strava access token for a user, refreshing if expired.
 * Returns { accessToken, integration } or null if not connected.
 */
export async function getStravaToken(userId) {
  const { data: integration, error } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "strava")
    .eq("is_active", true)
    .single();

  if (error || !integration) return null;

  // Check if token is expired (with 5-min buffer)
  const expiresAt = new Date(integration.token_expires_at).getTime();
  const now = Date.now();

  if (now < expiresAt - 5 * 60 * 1000) {
    return { accessToken: integration.access_token, integration };
  }

  // Refresh the token
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: integration.refresh_token,
    }),
  });

  if (!res.ok) {
    // Mark integration as errored
    await supabaseAdmin
      .from("integrations")
      .update({ sync_status: "error", sync_error: "Token refresh failed" })
      .eq("id", integration.id);
    return null;
  }

  const data = await res.json();

  // Update stored tokens
  await supabaseAdmin
    .from("integrations")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: new Date(data.expires_at * 1000).toISOString(),
    })
    .eq("id", integration.id);

  return { accessToken: data.access_token, integration: { ...integration, access_token: data.access_token } };
}

/**
 * Make an authenticated Strava API request.
 */
export async function stravaFetch(accessToken, path) {
  const res = await fetch(`https://www.strava.com/api/v3${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 429) {
    throw new Error("Strava rate limit exceeded");
  }

  if (!res.ok) {
    throw new Error(`Strava API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
