import axios from 'axios';
import {API_BASE_URL} from "../config";

/**
 * Sends email to one or more recipients, with subject/body and full attachment list.
 * @param {Object} params
 * @param {{email: string, name: string}[]} params.to - Array of recipient objects
 * @param {string} params.subject - Email subject
 * @param {string} params.body - HTML body
 * @param {string} [params.from_name] - Optional sender display name
 * @param {string} [params.reply_to] - Optional reply-to address
 */
export async function sendEmail({ to, subject, body, from_name, reply_to }) {
  const res = await fetch(`${API_BASE_URL}/email/send-all-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_EMAIL_API_TOKEN}`
    },
    body: JSON.stringify({ 
      to,
      subject,
      body,
      from_name,
      reply_to,
      include_attachments: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Send failed: ${err}`);
  }

  return res.json();
}
