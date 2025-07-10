import axios from 'axios';
import {API_BASE_URL} from "../config";

/**
 * Sends email to one or more recipients, with subject/body and full attachment list.
 * @param {Object} params
 * @param {string[]} params.to - Array of email addresses
 * @param {string} params.subject - Email subject
 * @param {string} params.body - HTML body
 * @param {string} [params.from_name] - Optional sender display name
 * @param {string} [params.reply_to] - Optional reply-to address
 * @param {Array<{file_name: string, file_url: string}>} [params.attachments] - Optional attachment list
 */
export async function sendEmail({ to, subject, body, from_name, reply_to }) {
  const res = await fetch(`${API_BASE_URL}/email/send-all`, {
    method: 'POST',
    credentials: 'include', // ✅ Critical
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to,
      subject,
      body,
      from_name,
      reply_to
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to send email');
  }

  return res.json();
}

