import axios from "axios";
import { API_BASE_URL } from "../config";

// Upload the actual PDF file (multipart)
export async function uploadAttachmentFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await axios.post(
    `${API_BASE_URL}/email/upload-attachment`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
  );
  // server responds: { success:true, filename }
  return data;
}

// Save attachment metadata in DB (links file to template)
export async function addAttachmentMetadata({ template_id, file_name, file_url }) {
  const { data } = await axios.post(
    `${API_BASE_URL}/email/attachments`,
    { template_id, file_name, file_url },
    { withCredentials: true }
  );
  // returns { id, file_name, file_url, created_at }
  return data;
}

// Delete attachment metadata row by id
export async function deleteAttachmentMetadata(id) {
  const { data } = await axios.post(
    `${API_BASE_URL}/email/attachments/delete`,
    { id },
    { withCredentials: true }
  );
  return data;
}
