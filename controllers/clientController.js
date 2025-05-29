import db from '../services/db.js';

export async function getAllAuthorities(req, res) {
  try {
    const result = await db.query(`
    SELECT 
        email,
        STRING_AGG(name, ', ') AS names,
        MAX("latestInfoDate") AS last_email_sent
      FROM issuer
      WHERE email IS NOT NULL AND name IS NOT NULL
      GROUP BY email
      ORDER BY names 
    `);

    const authorities = result.rows.map((row, index) => ({
      id: index + 1,
      name: row.names,
      email: row.email,
      last_email_sent: row.last_email_sent
    }));

    res.json(authorities);
  } catch (err) {
    console.error('❌ Failed to fetch authorities:', err);
    res.status(500).json({ error: 'Failed to load authorities' });
  }
}
