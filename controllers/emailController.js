// server/controllers/emailController.js
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { query } from '../db/index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// server root folder (…/server)
const SERVER_ROOT = path.resolve(__dirname, '..');

// use server/attachments as absolute dir always
const ATTACHMENTS_DIR = path.join(SERVER_ROOT, 'attachments');


/** -----------------------------
 * Upload a PDF to /attachments with an ASCII-safe filename,
 * keep the original name for display in email clients.
 * Responds: { success, savedFilename, originalFilename }
 * ----------------------------*/
export async function uploadAttachmentFile(req, res) {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    const originalName = file.name ?? 'file.pdf';
    const ext = (originalName.match(/\.[^.]+$/)?.[0] || '').toLowerCase();

    if (ext !== '.pdf') {
      return res.status(400).json({ error: 'Only PDF files allowed' });
    }

    // Ensure folder exists
    await fsp.mkdir(ATTACHMENTS_DIR, { recursive: true });

    // ASCII-safe filename on disk
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const safeName = `${uid}${ext}`;
    const uploadPath = path.join(ATTACHMENTS_DIR, safeName);

    await file.mv(uploadPath); // express-fileupload returns a promise when no callback passed
    return res.json({ success: true, savedFilename: safeName, originalFilename: originalName });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
}

/** -----------------------------
 * Delete a file from disk by filename (legacy helper)
 * Body: { filename }
 * ----------------------------*/
export async function deleteAttachment(req, res) {
  const { filename } = req.body;
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: "Invalid 'filename'." });
  }
  try {
    const filePath = path.join(ATTACHMENTS_DIR, filename);
    await fsp.unlink(filePath);
    console.log(`🗑 Attachment deleted: ${filename}`);
    return res.json({ success: true, deleted: filename });
  } catch (err) {
    console.error(`❌ Failed to delete attachment: ${filename}`, err);
    return res.status(500).json({ error: 'Failed to delete attachment' });
  }
}

/** -----------------------------
 * Build Nodemailer attachments from DB rows
 * Uses disk path from file_url + display filename from file_name
 * Skips missing files to avoid ENOENT crashes
 * ----------------------------*/
export async function buildDbAttachments() {
  const { rows } = await query(`
    SELECT file_name, file_url
    FROM attachments
    ORDER BY id
  `);

  const list = [];
  for (const r of rows) {
    // file_url like "/attachments/alpha.pdf" -> "<cwd>/attachments/alpha.pdf"
    const diskPath = path.join(SERVER_ROOT, r.file_url.replace(/^\//, ''));
    if (!fs.existsSync(diskPath)) {
      console.warn('[attachments] missing file, skipping:', diskPath);
      continue;
    }
    list.push({
      filename: r.file_name || path.basename(diskPath), // shown in the email client
      path: diskPath,                                   // actual file to attach
      contentType: 'application/pdf',
      contentDisposition: 'attachment',
    });
    
  }
  console.log('Attachments to send:', list.map(a => a.filename), 'count =', list.length);
  return list;
}

/** -----------------------------
 * Send a single test email (array of raw emails)
 * Body: { to: string[], subject, body, from_name?, reply_to? }
 * ----------------------------*/
export async function sendTestEmail(req, res) {
  const { to, subject, body, from_name, reply_to } = req.body;

  if (!Array.isArray(to) || to.length === 0 || to.some(e => typeof e !== 'string')) {
    return res.status(400).json({ error: "Invalid 'to'. Must be an array of strings." });
  }
  if (typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ error: "Invalid 'subject'." });
  }
  if (typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: "Invalid 'body'." });
  }

  const attachments = await buildDbAttachments();

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // 587 with STARTTLS
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  const rtlBody = `<div dir="rtl" style="text-align:right; font-family:Arial, sans-serif;">${body}</div>`;

  try {
    const info = await transporter.sendMail({
      from: `"${from_name || 'Demo System'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: rtlBody,
      replyTo: reply_to || undefined,
      attachments,
    });
    console.log('Accepted:', info.accepted, 'Rejected:', info.rejected, 'MessageId:', info.messageId);
    return res.json({ success: true, sent: true });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/** -----------------------------
 * Send bulk emails (recipients = [{email, name}])
 * Body: { to: {email,name}[], subject, body, from_name?, reply_to? }
 * ----------------------------*/
export async function sendBulkEmails(req, res) {
  const {
    to = [],
    subject,
    body,
    from_name,
    reply_to,
    include_attachments = true,   // <-- read flag from client (default true)
  } = req.body;

  if (!Array.isArray(to) || to.length === 0 || to.some(r => !r.email || typeof r.email !== 'string')) {
    return res.status(400).json({ error: "Invalid 'to'. Must be a non-empty array of { email, name }." });
  }
  if (typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ error: "Invalid 'subject'." });
  }
  if (typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: "Invalid 'body'." });
  }

  const { rows: tplRows } = await query('SELECT id FROM email_templates ORDER BY id LIMIT 1');
  const templateId = tplRows[0]?.id ?? null;

  const emails = to.map(r => r.email);
  let authByEmail = new Map();
  if (emails.length > 0) {
    const { rows: authRows } = await query(
      'SELECT id, email FROM authorities WHERE email = ANY($1::text[])',
      [emails]
    );
    authByEmail = new Map(authRows.map(r => [r.email, r.id]));
  }

  // <-- only attach when include_attachments is true
  const attachments = include_attachments ? await buildDbAttachments() : [];

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  const rtlBody = `<div dir="rtl" style="text-align:right; font-family:Arial, sans-serif;">${body}</div>`;
  const results = [];

  for (const recipient of to) {
    const recipientEmail = recipient.email;
    const recipientName = recipient.name || '';
    const personalizedSubject = `${subject} ${recipientName}`.trim();
    const authorityId = authByEmail.get(recipientEmail) ?? null;

    try {
      const info = await transporter.sendMail({
        from: `"${from_name || 'Demo System'}" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: personalizedSubject,
        html: rtlBody,
        replyTo: reply_to || undefined,
        attachments,
      });

      await query(
        `INSERT INTO email_logs (authority_id, email, template_id, status)
         VALUES ($1, $2, $3, 'sent')`,
        [authorityId, recipientEmail, templateId]
      );

      console.log('✅ sent to', recipientEmail, 'msgId:', info.messageId);
      results.push({ to: recipientEmail, success: true });
    } catch (err) {
      console.error(`❌ Failed to send to ${recipientEmail}:`, err);

      await query(
        `INSERT INTO email_logs (authority_id, email, template_id, status, error)
         VALUES ($1, $2, $3, 'failed', $4)`,
        [authorityId, recipientEmail, templateId, (err?.message || 'unknown error').slice(0, 500)]
      );

      results.push({ to: recipientEmail, success: false, error: err.message });
    }
  }

  return res.json({ success: true, results });
}


/** -----------------------------
 * Token middleware for /send-all-token
 * ----------------------------*/
export function verifyEmailApiToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || token !== process.env.EMAIL_API_TOKEN) {
    console.error('❌ Invalid or missing API token');
    return res.status(401).json({ error: 'Invalid API token' });
  }
  return next();
}

/** -----------------------------
 * Legacy JSON template endpoints (kept for compatibility)
 * ----------------------------*/
const TEMPLATE_PATH = path.join(process.cwd(), 'data', 'email_template.json');

export async function getEmailTemplate(req, res) {
  try {
    const fileContent = await fsp.readFile(TEMPLATE_PATH, 'utf-8');
    const template = JSON.parse(fileContent);
    return res.json(template);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.json({
        subject: '',
        body: '',
        attachments: [],
        from_name: '',
        reply_to: '',
        is_active: true,
      });
    }
    console.error('❌ Failed to load template:', err);
    return res.status(500).json({ error: 'Failed to load template' });
  }
}

export async function saveEmailTemplate(req, res) {
  const { subject, body, from_name, reply_to, attachments = [] } = req.body;

  if (typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ error: 'Subject is required.' });
  }
  if (typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'Body is required.' });
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
    is_active: true,
  };

  try {
    await fsp.mkdir(path.dirname(TEMPLATE_PATH), { recursive: true });
    await fsp.writeFile(TEMPLATE_PATH, JSON.stringify(newTemplate, null, 2));
    return res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to save template:', err);
    return res.status(500).json({ error: 'Failed to save template' });
  }
}

export async function listAttachments(req, res) {
  try {
    await fsp.access(ATTACHMENTS_DIR).catch(() => {
      throw Object.assign(new Error('Attachments directory missing on server'), { code: 'ENOENT' });
    });

    const files = await fsp.readdir(ATTACHMENTS_DIR);
    const fileDetails = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(ATTACHMENTS_DIR, file);
        const stats = await fsp.stat(fullPath);
        return { name: file, sizeKB: (stats.size / 1024).toFixed(1) };
      })
    );

    return res.json(fileDetails);
  } catch (err) {
    console.error('❌ Failed to list attachments:', err.stack || err);
    return res.status(500).json({ error: 'Failed to list attachments' });
  }
}
