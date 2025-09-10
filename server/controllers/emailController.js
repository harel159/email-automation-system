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

// --- Minimal templating for {{placeholders}} with HTML safety ---
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderTemplate(tmpl, vars) {
  if (typeof tmpl !== "string" || !tmpl) return tmpl;
  return tmpl.replace(/{{\s*(\w+)\s*}}/g, (_, key) => escapeHtml(vars[key]));
}

function varsFromRecipient(recipient) {
  const full = (recipient?.name || "").trim();
  const [firstName = "", ...rest] = full.split(/\s+/);
  const lastName = rest.join(" ");
  return {
    name: full,
    firstName,
    lastName,
    email: recipient?.email || "",
  };
}



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
  //  Support both JSON and multipart(FormData)
  let bodyPayload = req.body;
  if (req.body && typeof req.body.json === "string") {
    try {
      bodyPayload = JSON.parse(req.body.json);
    } catch (e) {
      return res.status(400).json({ error: "Invalid multipart json payload" });
    }
  }

  const {
    to = [],
    subject,
    body,
    from_name,
    reply_to,
    include_attachments = true,
  } = bodyPayload;

  // Validate
  if (!Array.isArray(to) || to.length === 0 || to.some(r => !r.email || typeof r.email !== 'string')) {
    return res.status(400).json({ error: "Invalid 'to'. Must be a non-empty array of { email, name }." });
  }
  if (typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ error: "Invalid 'subject'." });
  }
  if (typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: "Invalid 'body'." });
  }

  //  Template id 
  const { rows: tplRows } = await query('SELECT id FROM email_templates ORDER BY id LIMIT 1');
  const templateId = tplRows[0]?.id ?? null;

  //  Map authorities by email
  const emails = to.map(r => r.email);
  let authByEmail = new Map();
  if (emails.length > 0) {
    const { rows: authRows } = await query(
      'SELECT id, email FROM authorities WHERE email = ANY($1::text[])',
      [emails]
    );
    authByEmail = new Map(authRows.map(r => [r.email, r.id]));
  }

  
  let attachments = [];
  if (req.files && req.files.attachments) {
    const raw = Array.isArray(req.files.attachments)
      ? req.files.attachments
      : [req.files.attachments];

    attachments = raw.map(f => ({
      filename: f.name,
      content: f.data,        
      contentType: f.mimetype,
    }));
  } else if (include_attachments) {
    attachments = await buildDbAttachments();
  }

  //  Transporter 
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  const results = [];

  //Send loop with per-recipient templating
  for (const recipient of to) {
    const recipientEmail = recipient.email;
    const authorityId = authByEmail.get(recipientEmail) ?? null;

    // Build variables and render placeholders
    const tplVars = varsFromRecipient(recipient); // {{name}}
    const personalizedSubject = renderTemplate(subject, tplVars) || subject;
    const personalizedBody    = renderTemplate(body,    tplVars) || body;

    // RTL wrapper must wrap the personalized body
    const rtlBody = `<div dir="rtl" style="text-align:right; font-family:Arial, sans-serif;">${personalizedBody}</div>`;

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


