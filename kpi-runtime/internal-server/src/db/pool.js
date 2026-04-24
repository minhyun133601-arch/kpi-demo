import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000
    });
  }
  return pool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

export async function withClient(fn) {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function withTransaction(fn) {
  return withClient(async (client) => {
    await client.query('begin');
    try {
      const result = await fn(client);
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  });
}

export async function checkDatabaseHealth() {
  try {
    const result = await query(
      'select current_database() as database_name, current_user as user_name, now() as server_time'
    );
    const row = result.rows[0];
    return {
      ok: true,
      database: row.database_name,
      user: row.user_name,
      serverTime: row.server_time
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

export async function closePool() {
  if (!pool) return;
  const target = pool;
  pool = undefined;
  await target.end();
}
