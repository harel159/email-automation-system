import { API_BASE_URL } from "../config";

/**
 * Sends email to one or more recipients, with subject/body and optional one-time attachments.
 * @param {Object} params
 * @param {{email: string, name: string}[]} params.to - Array of recipient objects
 * @param {string} params.subject - Email subject
 * @param {string} params.body - HTML body
 * @param {File[]} [params.attachments] - Optional one-time File[] from <input type="file">
 * @param {string} [params.from_name] - Optional sender display name
 * @param {string} [params.reply_to] - Optional reply-to address
 * @param {boolean} [params.include_attachments] - Whether to also pull template attachments (default true)
 */
export async function sendEmail({
  to,
  subject,
  body,
  attachments = [],
  from_name,
  reply_to,
  include_attachments = true,
}) {
  const url = `${API_BASE_URL}/email/send-all-token`;

  let response;

  if (attachments && attachments.length > 0) {
    // --- multipart/form-data ---
    const fd = new FormData();
    // pack non-file fields together so backend can JSON.parse(req.body.json)
    fd.append(
      "json",
      JSON.stringify({ to, subject, body, from_name, reply_to, include_attachments })
    );
    attachments.forEach((f) => fd.append("attachments", f, f.name));

    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_EMAIL_API_TOKEN}`,
        // NOTE: don't set Content-Type manually; browser sets correct boundary
      },
      body: fd,
    });
  } else {
    // --- plain JSON ---
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_EMAIL_API_TOKEN}`,
      },
      body: JSON.stringify({ to, subject, body, from_name, reply_to, include_attachments }),
    });
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Send failed: ${errText}`);
  }
  return response.json();
}
