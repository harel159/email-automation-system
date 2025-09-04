// server/controllers/emailTemplateController.js
import { query } from '../db/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, '..');


/**
 * GET the first email template + its attachments (from Postgres)
 */
export async function getEmailTemplate(req, res) {
  try {
    const t = await query(
      `SELECT id, title, subject, body_html
       FROM email_templates
       ORDER BY id ASC
       LIMIT 1`
    );

    if (!t.rows.length) {
      // Return a safe empty template so the UI can render without checks
      return res.json({
        id: null,
        title: '',
        subject: '',
        body_html: '',
        attachments: []
      });
    }
    const template = t.rows[0];

    const atts = await query(
      `SELECT id, file_name, file_url, created_at
       FROM attachments
       WHERE template_id = $1
       ORDER BY id`,
      [template.id]
    );

    res.json({ ...template, attachments: atts.rows });
  } catch (e) {
    console.error('getEmailTemplate error:', e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * CREATE or UPDATE a template (metadata only)
 * Body: { id?, title, subject, body_html }
 */
export async function saveEmailTemplate(req, res) {
  try {
    const { id, title, subject, body_html } = req.body;

    if (id) {
      const r = await query(
        `UPDATE email_templates
           SET title=$1, subject=$2, body_html=$3, updated_at=now()
         WHERE id=$4
         RETURNING id, title, subject, body_html`,
        [title, subject, body_html, id]
      );
      return res.json(r.rows[0]);
    } else {
      const r = await query(
        `INSERT INTO email_templates (title, subject, body_html)
         VALUES ($1,$2,$3)
         RETURNING id, title, subject, body_html`,
        [title, subject, body_html]
      );
      return res.json(r.rows[0]);
    }
  } catch (e) {
    console.error('saveEmailTemplate error:', e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * ADD attachment metadata row (file already uploaded to /attachments)
 * Body: { template_id, file_name, file_url }
 */
export async function addAttachment(req, res) {
  try {
    const { template_id, file_name, file_url } = req.body;
    if (!template_id || !file_name || !file_url) {
      return res.status(400).json({ error: 'template_id, file_name, file_url are required' });
    }
    // Sanity: ensure the file actually exists on disk (file_url starts with /attachments/…)
    const diskPath = path.join(SERVER_ROOT, String(file_url).replace(/^\//, ''));
    if (!fs.existsSync(diskPath)) {
      return res.status(400).json({ error: 'File does not exist on server. Upload first.' });
    }
    const r = await query(
      `INSERT INTO attachments (template_id, file_name, file_url)
       VALUES ($1,$2,$3)
       RETURNING id, file_name, file_url, created_at`,
      [template_id, file_name, file_url]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.error('addAttachment error:', e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * DELETE attachment metadata row
 * Body: { id, also_delete_file?: boolean }
 */
export async function deleteAttachmentDb(req, res) {
  try {
    const { id, also_delete_file = false } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });
    // fetch file_url first
    const { rows: toDelete } = await query(`SELECT file_url FROM attachments WHERE id=$1`, [id]);
    if (!toDelete.length) return res.status(404).json({ error: 'Attachment not found' });

    const fileUrl = toDelete[0].file_url;
    await query(`DELETE FROM attachments WHERE id=$1`, [id]);

    if (also_delete_file && fileUrl) {
      // only delete physical file if no other rows reference it
      const { rows: refs } = await query(
        `SELECT COUNT(*)::int AS n FROM attachments WHERE file_url = $1`,
        [fileUrl]
      );
      if ((refs[0]?.n || 0) === 0) {
        const diskPath = path.join(SERVER_ROOT, fileUrl.replace(/^\//, ''));
        try {
          fs.unlinkSync(diskPath);
          console.log('🗑 deleted file:', diskPath);
        } catch (err) {
          // ignore if missing
          console.warn('could not delete file (may not exist):', diskPath);
        }
      }
    }

    res.json({ ok: true, deleted: id });
  } catch (e) {
    console.error('deleteAttachmentDb error:', e);
    res.status(500).json({ error: e.message });
  }
}
