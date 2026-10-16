/**
 * src/db/index.js — PostgreSQL connection pool for News Pulse backend.
 *
 * Uses the `pg` package (node-postgres) with a connection pool.
 * The same Neon DATABASE_URL used by the Python scraper.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },   // required for Neon
  max: 10,                              // max pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Verify connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('[DB] Failed to connect to PostgreSQL:', err.message);
  } else {
    console.log('[DB] Connected to Neon PostgreSQL ✓');
    release();
  }
});

/**
 * Run a parameterised query and return rows.
 * @param {string} text  — SQL with $1, $2... placeholders
 * @param {any[]}  params — query parameters
 */
async function query(text, params = []) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.LOG_QUERIES === 'true') {
      console.log('[DB] query', { text: text.slice(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('[DB] Query error:', err.message, '\nSQL:', text.slice(0, 200));
    throw err;
  }
}

module.exports = { query, pool };
