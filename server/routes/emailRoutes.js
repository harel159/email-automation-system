import express from 'express';
import { uploadAttachmentFile, sendTestEmail, sendBulkEmails } from '../controllers/emailController.js';

const router = express.Router();

router.post('/test-send', sendTestEmail);
router.post('/upload-attachment', uploadAttachmentFile);
router.post('/send-all', sendBulkEmails);

export default router;
