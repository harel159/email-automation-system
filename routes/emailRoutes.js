import express from 'express';
import { 
  uploadAttachmentFile, 
  sendTestEmail, 
  sendBulkEmails, 
  getEmailTemplate, 
  saveEmailTemplate,
  listAttachments
} from '../controllers/emailController.js';

const router = express.Router();

router.get('/attachments', listAttachments)
router.post('/test-send', sendTestEmail);
router.post('/upload-attachment', uploadAttachmentFile);
router.post('/send-all', sendBulkEmails);
router.get('/template', getEmailTemplate); 
router.post('/template', saveEmailTemplate);

export default router;
