import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/clients';

/**
 * Bulk create authorities in the database.
 * Skips duplicates server-side by email.
 * 
 * @param {Array<Object>} authorities - List of { name, email, send_date, status }
 * @returns {Array<Object>} - Successfully created authorities
 */
export async function bulkCreateAuthorities(authorities) {
  try {
    const res = await axios.post(`${BASE_URL}/bulk-create`, { authorities });
    return res.data?.created || [];
  } catch (err) {
    console.error('❌ Failed to bulk create authorities:', err.message);
    return [];
  }
}

/**
 * Fetch all existing authorities.
 * 
 * @returns {Array<Object>} List of authorities [{ id, name, email, ... }]
 */
export async function getAuthorities() {
  try {
    const res = await axios.get(BASE_URL);
    return res.data || [];
  } catch (err) {
    console.error('❌ Failed to fetch authorities:', err.message);
    return [];
  }
}

/**
 * Create or update a single authority.
 * 
 * @param {Object} authority - Authority data { id?, name, email, send_date, status }
 * @returns {Object|null} - Created/updated authority or null
 */
export async function saveAuthority(authority) {
  try {
    const res = authority.id
      ? await axios.put(`${BASE_URL}/${authority.id}`, authority)
      : await axios.post(BASE_URL, authority);

    return res.data;
  } catch (err) {
    console.error(`❌ Failed to ${authority.id ? "update" : "create"} authority:`, err.message);
    return null;
  }
}

/**
 * Delete a single authority by ID.
 * 
 * @param {string} id - Authority ID
 * @returns {boolean} - true if deleted successfully
 */
export async function deleteAuthority(id) {
  try {
    await axios.delete(`${BASE_URL}/${id}`);
    return true;
  } catch (err) {
    console.error('❌ Failed to delete authority:', err.message);
    return false;
  }
}
