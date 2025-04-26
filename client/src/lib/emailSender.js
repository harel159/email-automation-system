import axios from 'axios';

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
export async function sendEmail({ to, subject, body, from_name, reply_to, attachments = [] }) {
  const res = await axios.post('http://localhost:5000/api/email/send-all', {
    to,
    subject,
    body,
    from_name,
    reply_to,
  });

  return res.data;
}
