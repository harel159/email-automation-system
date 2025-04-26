
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/email/template';

/**
 * Fetch the current email template from the backend.
 * 
 * @returns {Promise<Object>} - Template object from DB
 */
export async function getEmailTemplate() {
  const res = await axios.get(API_BASE);
  return res.data;
}

/**
 * Save or update the email template.
 * 
 * @param {Object} template - Email template object to save
 * @param {string} template.subject
 * @param {string} template.body
 * @param {string} [template.from_name]
 * @param {string} [template.reply_to]
 * @param {boolean} [template.is_active]
 * @param {Array} [template.attachments]
 * @returns {Promise<Object>}
 */
export async function saveEmailTemplate(template) {
  const res = await axios.post(API_BASE, template);
  return res.data;
}
