import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client;
function getClient() {
  if (!client) {
    if (!accountSid || !authToken) {
      throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
    }
    client = twilio(accountSid, authToken);
  }
  return client;
}

/**
 * Send an SMS message via Twilio.
 * @param {string} to - E.164 formatted phone number (e.g. +15551234567)
 * @param {string} body - Message text (max ~1600 chars to avoid splitting)
 * @returns {Promise<object>} Twilio message SID and status
 */
export async function sendSMS(to, body) {
  if (!fromNumber) throw new Error("TWILIO_PHONE_NUMBER not configured");

  const message = await getClient().messages.create({
    to,
    from: fromNumber,
    body,
  });

  return { sid: message.sid, status: message.status };
}

/**
 * Verify that an inbound request is from Twilio (webhook signature validation).
 * @param {object} req - Vercel request object
 * @param {string} url - The full URL of the webhook endpoint
 * @returns {boolean}
 */
export function verifyWebhookSignature(req, url) {
  if (!authToken) return false;

  const signature = req.headers["x-twilio-signature"];
  if (!signature) return false;

  return twilio.validateRequest(authToken, signature, url, req.body || {});
}

/**
 * Format a TwiML response for replying to inbound SMS.
 * @param {string} message - Reply text
 * @returns {string} TwiML XML string
 */
export function twimlResponse(message) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
