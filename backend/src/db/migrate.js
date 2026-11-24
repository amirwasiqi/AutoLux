import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, 'migrations');

async function ensureMigrationLedger(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text UNIQUE,
    name text UNIQUE,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  // Phase 1 used filename; standalone Phase 2 used name. Support either existing database.
  await client.query('ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS filename text');
  await client.query('ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS name text');
  await client.query(`UPDATE schema_migrations SET filename = COALESCE(filename, name), name = COALESCE(name, filename)`);
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS schema_migrations_filename_unique ON schema_migrations(filename) WHERE filename IS NOT NULL');
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS schema_migrations_name_unique ON schema_migrations(name) WHERE name IS NOT NULL');
}

const client = await pool.connect();
try {
  await ensureMigrationLedger(client);
  const names = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
  for (const filename of names) {
    const existing = await client.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1 OR name = $1 LIMIT 1',
      [filename]
    );
    if (existing.rowCount) continue;
    const sql = await readFile(path.join(migrationsDir, filename), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(filename, name) VALUES ($1, $1)', [filename]);
      await client.query('COMMIT');
      console.log(`Applied migration: ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} catch (error) {
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
