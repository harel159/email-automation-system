// server/routes/emailRoutes.js
import express from 'express';
import {
  uploadAttachmentFile,
  sendBulkEmails,
} from '../controllers/emailController.js';

import {
  getEmailTemplate,
  saveEmailTemplate,
  addAttachment,
  deleteAttachmentDb
} from '../controllers/emailTemplateController.js';

const router = express.Router();

// Files on disk
router.post('/upload-attachment', uploadAttachmentFile);

// Template from Postgres
router.get('/template', getEmailTemplate);
router.post('/template', saveEmailTemplate);
router.put('/template/:id', saveEmailTemplate);

// Attachment metadata in Postgres
router.post('/attachments', addAttachment);
router.post('/attachments/delete', deleteAttachmentDb);


// (Optional) if you still want a read-only list endpoint later, we can add one.

export default router;
