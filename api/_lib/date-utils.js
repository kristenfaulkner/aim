/**
 * Timezone-aware date utilities.
 * Vercel runs in UTC — these helpers compute dates in the user's local timezone.
 */

/**
 * Get today's date (YYYY-MM-DD) in the given IANA timezone.
 * Falls back to UTC if timezone is invalid.
 */
export function localDate(timezone) {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: timezone || "UTC" });
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Get a date N days ago (YYYY-MM-DD) in the given IANA timezone.
 */
export function localDateDaysAgo(days, timezone) {
  try {
    return new Date(Date.now() - days * 86400000).toLocaleDateString("en-CA", { timeZone: timezone || "UTC" });
  } catch {
    return new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  }
}

/**
 * Fetch the user's IANA timezone from their profile.
 * Returns "America/New_York" as default if not set.
 */
export async function getUserTimezone(supabaseAdmin, userId) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();
  return data?.timezone || "America/New_York";
}
