// server/controllers/customerController.js
import { query } from '../db/index.js';

// GET /api/customers  -> [{id,name,email,active}]
export async function getAllCustomers(req, res) {
  try {
    const { rows } = await query(`
      SELECT id, name, email, active
      FROM customers
      WHERE active = true
      ORDER BY name
    `);

    // shape exactly what the Manual Email UI expects
    const list = rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      active: r.active,
    }));

    res.json(list);
  } catch (err) {
    console.error('GET /api/customers error:', err);
    res.status(500).json({ error: 'Failed to load customers' });
  }
}
