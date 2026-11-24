
import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 15_000,
  ...(env.databaseSsl ? { ssl: { rejectUnauthorized: true } } : {})
});
pool.on('error', (error) => {
  console.error('Unexpected idle PostgreSQL client error', error);
});
