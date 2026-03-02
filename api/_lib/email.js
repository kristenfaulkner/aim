import { Resend } from "resend";

let client;
function getClient() {
  if (!client) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY must be set");
    }
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

/**
 * Send an email via Resend.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} html - HTML email body
 * @returns {Promise<object>} Resend response with id and status
 */
export async function sendEmail(to, subject, html) {
  const from = process.env.RESEND_FROM_EMAIL || "AIM <coach@aimfitness.ai>";

  const { data, error } = await getClient().emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) throw new Error(error.message || "Failed to send email");

  return { id: data?.id, status: "sent" };
}
