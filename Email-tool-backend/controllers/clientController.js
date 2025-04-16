import db from '../services/db.js';

/**
 * Bulk inserts new authorities into the database.
 * - Skips any entries that already exist (based on email).
 * - Returns a list of newly created authorities.
 */
export async function bulkCreateAuthorities(req, res) {
  const { authorities } = req.body; // Array of authority objects
  const created = [];

  try {
    for (const auth of authorities) {
      const { email, name, municipality } = auth;

      // 🔍 Check if authority already exists by email
      const result = await db.query(
        'SELECT id FROM authorities WHERE email = $1',
        [email]
      );

      if (result.rows.length > 0) continue; // Skip existing

      // 📝 Insert new authority into DB
      await db.query(
        'INSERT INTO authorities (email, name, municipality) VALUES ($1, $2, $3)',
        [email, name, municipality]
      );

      created.push(auth); // Track what we inserted
    }

    // ✅ Respond with created authorities
    res.json({ success: true, created });
  } catch (err) {
    console.error('❌ Error in bulkCreateAuthorities:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}
// ✅ GET all authorities
export async function getAllAuthorities(req, res) {
  try {
    const result = await db.query('SELECT id, name, email FROM authorities ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Failed to fetch authorities:', err);
    res.status(500).json({ error: 'Failed to load authorities' });
  }
}

