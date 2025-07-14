
import fs from 'fs/promises';
import path from 'path';
import { getAllAttachments } from '../services/attachmentService.js';
import nodemailer from 'nodemailer';
import pool from '../services/db.js';

const TEMPLATE_PATH = path.join('data', 'email_template.json');
const ATTACHMENTS_DIR = path.join('attachments');




// ========= Upload Attachment ========= //
export async function uploadAttachmentFile(req, res) {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const file = req.files.file;

  if (!file.name.endsWith('.pdf')) {
    return res.status(400).json({ error: 'Only PDF files allowed' });
  }

  const uploadPath = path.join('attachments', file.name);

  try {
    await file.mv(uploadPath);
    res.json({ success: true, filename: file.name });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
}

// ========= Send Test Email ========= //
export async function sendTestEmail(req, res) {
  const { to, subject, body, from_name, reply_to } = req.body;

  if (!Array.isArray(to) || to.length === 0 || to.some(email => typeof email !== 'string')) {
    return res.status(400).json({ error: "Invalid 'to' field. Must be a non-empty array of strings." });
  }
  if (typeof subject !== 'string' || subject.trim() === "") {
    return res.status(400).json({ error: "Invalid 'subject'. Must be a non-empty string." });
  }
  if (typeof body !== 'string' || body.trim() === "") {
    return res.status(400).json({ error: "Invalid 'body'. Must be a non-empty string." });
  }

  const attachments = getAllAttachments().map(file => ({
    filename: file.name,
    path: file.path
  }));

  console.log("📎 Sending with server-side attachments:", attachments);

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"${from_name || 'Road'}" <${process.env.EMAIL_USER}>`,
      to,
      subject: subject || "No subject",
      html: body || "<p>No content provided.</p>",
      replyTo: reply_to || undefined,
      attachments
    });

    res.json({ success: true, sent: true });
  } catch (err) {
    console.error("Email send error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ========= Send Bulk Emails ========= //
export async function sendBulkEmails(req, res) {
  const { to = [], subject, body, from_name, reply_to } = req.body;

  if (!Array.isArray(to) || to.length === 0 || to.some(email => typeof email !== 'string')) {
    return res.status(400).json({ error: "Invalid 'to' field. Must be a non-empty array of strings." });
  }
  if (typeof subject !== 'string' || subject.trim() === "") {
    return res.status(400).json({ error: "Invalid 'subject'. Must be a non-empty string." });
  }
  if (typeof body !== 'string' || body.trim() === "") {
    return res.status(400).json({ error: "Invalid 'body'. Must be a non-empty string." });
  }


  const attachments = getAllAttachments().map(file => ({
    filename: file.name,
    path: file.path
  }));

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const results = [];

  for (const email of to) {
    try {
      await transporter.sendMail({
        from: `"${from_name || 'Road'}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: subject || "No subject",
        html: body || "<p>No content provided.</p>",
        replyTo: reply_to || undefined,
        attachments
      });
  
      // ✅ Update latestInfoDate in the DB
      await pool.query(
        'UPDATE issuer SET "latestInfoDate" = NOW() WHERE email = $1',
        [email]
      );
  
      results.push({ to: email, success: true });
    } catch (err) {
      console.error(`❌ Failed to send to ${email}:`, err);
      results.push({ to: email, success: false, error: err.message });
    }
  }

  res.json({ success: true, results });
}


//=================Token Middleware======================//


export function verifyEmailApiToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token || token !== process.env.EMAIL_API_TOKEN) {
    console.error('❌ Invalid or missing API token');
    return res.status(401).json({ error: 'Invalid API token' });
  }

  next();
}


// ========= Get Email Template ========= //
export async function getEmailTemplate(req, res) {
  try {
    const fileContent = await fs.readFile(TEMPLATE_PATH, 'utf-8');
    const template = JSON.parse(fileContent);
    res.json(template);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist yet → return default empty template
      return res.json({
        subject: '',
        body: '',
        attachments: [],
        from_name: '',
        reply_to: '',
        is_active: true
      });
    }
    console.error('❌ Failed to load template:', err);
    res.status(500).json({ error: 'Failed to load template' });
  }
}

// ========= Save Email Template ========= //
export async function saveEmailTemplate(req, res) {
  const { subject, body, from_name, reply_to, attachments = [] } = req.body;

  if (typeof subject !== 'string' || subject.trim() === "") {
    return res.status(400).json({ error: "Subject is required." });
  }
  if (typeof body !== 'string' || body.trim() === "") {
    return res.status(400).json({ error: "Body is required." });
  }
  if (from_name && typeof from_name !== 'string') {
    return res.status(400).json({ error: "'from_name' must be a string." });
  }
  if (reply_to && typeof reply_to !== 'string') {
    return res.status(400).json({ error: "'reply_to' must be a string." });
  }
  if (!Array.isArray(attachments)) {
    return res.status(400).json({ error: "'attachments' must be an array." });
  }


  const newTemplate = {
    subject: subject || '',
    body: body || '',
    from_name: from_name || '',
    reply_to: reply_to || '',
    attachments,
    is_active: true
  };

  try {
    await fs.writeFile(TEMPLATE_PATH, JSON.stringify(newTemplate, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to save template:', err);
    res.status(500).json({ error: 'Failed to save template' });
  }
}

export async function listAttachments(req, res) {
  try {
    console.log('📂 Trying to read attachments directory:', ATTACHMENTS_DIR);

    // Check if directory exists
    const dirExists = await fs.stat(ATTACHMENTS_DIR).then(() => true).catch(() => false);
    if (!dirExists) {
      console.error('❌ Attachments directory does not exist:', ATTACHMENTS_DIR);
      return res.status(500).json({ error: 'Attachments directory missing on server' });
    }

    const files = await fs.readdir(ATTACHMENTS_DIR);
    console.log('✅ Files found in attachments directory:', files);

    const fileDetails = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(ATTACHMENTS_DIR, file);
        const stats = await fs.stat(fullPath);
        return {
          name: file,
          sizeKB: (stats.size / 1024).toFixed(1)
        };
      })
    );

    res.json(fileDetails);
  } catch (err) {
    console.error('❌ Failed to list attachments:', err.stack || err);
    res.status(500).json({ error: 'Failed to list attachments' });
  }
}


