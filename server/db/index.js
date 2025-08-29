// server/db/index.js
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (EmailProject-Demo/.env)
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// --- TEMP DEBUG: verify what we actually loaded ---
const dbg = {
  envPath,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_DATABASE: process.env.DB_DATABASE,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD_type: typeof process.env.DB_PASSWORD,
  DB_PASSWORD_len: (process.env.DB_PASSWORD || '').length,
  has_DATABASE_URL: Boolean(process.env.DATABASE_URL),
};
console.log('[db] Loaded env:', dbg);
// -----------------------------------------------

const { Pool } = pg;

// Build a connection string explicitly to avoid any weird parsing
const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT || 5432);
const db   = process.env.DB_DATABASE;
const user = process.env.DB_USER;
const pass = `${process.env.DB_PASSWORD ?? ''}`; // force string

if (!db || !user) {
  throw new Error('[db] Missing DB_DATABASE or DB_USER from environment');
}

const connectionString =
  `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;

export const pool = new Pool({
  connectionString,
  ssl: false,
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}
