export default function handler(req, res) {
  res.json({
    host: req.headers.host,
    vercelUrl: process.env.VERCEL_URL,
    vercelProjectUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    redirectUri: (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : `https://${req.headers.host}`) + "/api/auth/callback/strava",
    stravaClientId: process.env.STRAVA_CLIENT_ID ? "set" : "missing",
  });
}
