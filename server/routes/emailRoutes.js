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
router.get('/template', getEmailTemplate); 
router.post('/template', saveEmailTemplate);
router.post('/send-all', verifyEmailApiToken, sendBulkEmails);

export default router;
