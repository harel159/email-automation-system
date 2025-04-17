import fs from 'fs';
import path from 'path';
import { getAllAttachments } from '../services/attachmentService.js';
import nodemailer from 'nodemailer';

/**
 * Handles PDF file uploads into /attachments folder
 */
export async function uploadAttachmentFile(req, res) {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const file = req.files.file;

  // Ensure it's a .pdf
  if (!file.name.endsWith('.pdf')) {
    return res.status(400).json({ error: 'Only PDF files allowed' });
  }

  const uploadPath = path.join('attachments', file.name);

  try {
    // Move file to /attachments folder
    await file.mv(uploadPath);
    res.json({ success: true, filename: file.name });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
}

/**
 * Sends a single test email with all files from /attachments folder
 */
export async function sendTestEmail(req, res) {
  const { to, subject, body, from_name, reply_to } = req.body;

  // Always load all attachments from server
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

/**
 * Sends the monthly email with all attachments
 * to a list of recipients passed from frontend
 */
export async function sendBulkEmails(req, res) {
  const { to = [], subject, body, from_name, reply_to } = req.body;

  if (!Array.isArray(to) || to.length === 0) {
    return res.status(400).json({ success: false, error: 'No recipients provided' });
  }

  const attachments = getAllAttachments().map(file => ({
    filename: file.name,
    path: file.path
  }));
  console.log("📎 Sending to all recipients with attachments:", attachments);

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

      results.push({ to: email, success: true });
    } catch (err) {
      console.error(`❌ Failed to send to ${email}:`, err);
      results.push({ to: email, success: false, error: err.message });
    }
  }

  res.json({ success: true, results });
}
