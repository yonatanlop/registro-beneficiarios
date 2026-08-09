const { Pool } = require('pg');

let pool;

function getPool() {
  if (pool) return pool;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
    max: 10
  });
  pool.on('error', (err) => {
    console.error('[db] Error inesperado en el pool de Postgres', err);
  });
  console.log('[db] Pool de Postgres inicializado');
  return pool;
}

async function initPool() {
  const p = getPool();
  await p.query('SELECT 1');
  return p;
}

async function withConnection(fn) {
  const p = getPool();
  const client = await p.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { initPool, withConnection, closePool };
