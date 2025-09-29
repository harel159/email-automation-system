// server/controllers/clientController.js
import { query } from '../db/index.js';

// GET /api/clients  -> list authorities
// GET /api/clients  -> list authorities (with last sent email timestamp)
export async function getAllAuthorities(_req, res) {
  try {
    const { rows } = await query(`
      SELECT
        a.id,
        a.name,
        a.email,
        a.active,
        a.created_at,
        MAX(el.created_at) FILTER (WHERE el.status = 'sent') AS last_sent_at
      FROM public.authorities a
      LEFT JOIN public.email_logs el
        ON el.authority_id = a.id
      GROUP BY a.id, a.name, a.email, a.active, a.created_at
      ORDER BY a.name ASC
    `);

    // expose multiple keys so any UI variant can read it
    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      active: r.active,
      created_at: r.created_at,
      last_sent_at:  r.last_sent_at ?? null,
      lastEmailSent: r.last_sent_at ?? null,
      last_email_sent: r.last_sent_at ?? null,
    })));
  } catch (err) {
    console.error('GET /api/clients error:', err);
    res.status(500).json({ error: 'Failed to load authorities' });
  }
}


// POST /api/clients  -> create authority
// Body: { name, email, active? }
export async function createAuthority(req, res) {
  try {
    const { name, email, active = true } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const { rows } = await query(
      `INSERT INTO authorities (name, email, active)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, active`,
      [name.trim(), email.trim(), !!active]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    // if you have a unique(email) constraint, surface 409
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('POST /api/clients error:', err);
    res.status(500).json({ error: 'Failed to create authority' });
  }
}

// PUT /api/clients/:id  -> update authority
// Body: { name?, email?, active? }
export async function updateAuthority(req, res) {
  try {
    const id = Number(req.params.id);
    const { name, email, active } = req.body || {};

    const { rows } = await query(
      `UPDATE authorities
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           active = COALESCE($3, active)
       WHERE id = $4
       RETURNING id, name, email, active`,
      [name?.trim() ?? null, email?.trim() ?? null, active ?? null, id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('PUT /api/clients/:id error:', err);
    res.status(500).json({ error: 'Failed to update authority' });
  }
}

// DELETE /api/clients/:id  -> delete authority
export async function deleteAuthority(req, res) {
  try {
    const id = Number(req.params.id);
    const result = await query(`DELETE FROM authorities WHERE id = $1`, [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/clients/:id error:', err);
    res.status(500).json({ error: 'Failed to delete authority' });
  }
}
