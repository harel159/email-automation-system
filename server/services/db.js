import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // set this in .env
});

export default {
  query: (text, params) => pool.query(text, params),
};
