import { query } from '../db/index.js';

// GET /api/clients  → [{ id, name, email, last_email_sent }]
export async function getAllAuthorities(req, res) {
  try {
    const { rows } = await query(`
      SELECT
        a.id,
        a.name,
        a.email,
        -- latest successful send time for this email (null if never)
        (
          SELECT MAX(el.sent_at)
          FROM email_logs el
          WHERE el.email = a.email AND el.status = 'sent'
        ) AS last_email_sent
      FROM authorities a
      WHERE a.active = TRUE
      ORDER BY a.name
    `);

    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      last_email_sent: r.last_email_sent, // may be null
    })));
  } catch (err) {
    console.error('GET /api/clients error:', err);
    res.status(500).json({ error: err.message });
  }
}
