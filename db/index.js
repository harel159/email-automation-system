// server/db/index.js
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load env in a robust way:
 * - Project root .env: ../../.env
 * - Server-level .env: ../.env  (fallback)
 * - Default search: dotenv.config()
 */
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const { Pool } = pg;

let pool;
if (process.env.DATABASE_URL) {
  // Neon / hosted Postgres path
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Neon & many hosted providers need SSL; sslmode=require is in the URL,
    // but this makes Node 'pg' happy on Windows too.
    ssl: { rejectUnauthorized: false },
  });
  console.log("[db] Using DATABASE_URL (hosted)");
} else {
  // Local/dev fallback with discrete vars
  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT || 5432);
  const database = process.env.DB_DATABASE || "postgres";
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD || "";
  pool = new Pool({ host, port, database, user, password });
  console.log("[db] Using discrete DB_* variables (local)");
}

// Single, canonical query export (no duplicates)
export async function query(text, params) {
  // Optional lightweight logging; enable by setting DEBUG_SQL=1
  if (process.env.DEBUG_SQL === "1") {
    const t0 = Date.now();
    const res = await pool.query(text, params);
    const ms = Date.now() - t0;
    console.log("[sql]", { ms, rows: res.rowCount, text: String(text).slice(0, 120) });
    return res;
  }
  return pool.query(text, params);
}

export { pool };
