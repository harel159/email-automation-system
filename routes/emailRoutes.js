import express from 'express';
import {
  uploadAttachmentFile,
  sendTestEmail,
  sendBulkEmails,
  getEmailTemplate,
  saveEmailTemplate,
  listAttachments,
  verifyEmailApiToken
} from '../controllers/emailController.js';

const router = express.Router();

router.get('/attachments', listAttachments);
router.post('/test-send', sendTestEmail);
router.post('/upload-attachment', uploadAttachmentFile);

// ✅ For session-based dashboard
router.post('/send-all', sendBulkEmails);

// ✅ For token-based usage (external API, frontend with token)
router.post('/send-all-token', verifyEmailApiToken, sendBulkEmails);

router.get('/template', getEmailTemplate);
router.post('/template', saveEmailTemplate);

export default router;
