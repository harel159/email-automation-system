import axios from 'axios';
import {API_BASE_URL} from "../config";

const UPLOAD_ENDPOINT =`${API_BASE_URL}/email/upload-attachment`;

/**
 * Upload a single attachment file to the backend.
 * 
 * @param {File} file - The file object to upload
 * @returns {Promise<Object>} - { success: true, filename }
 */
export async function uploadAttachmentFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await axios.post(UPLOAD_ENDPOINT, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  } catch (err) {
    console.error('❌ Attachment upload failed:', err);
    throw new Error('Upload failed');
  }
}
