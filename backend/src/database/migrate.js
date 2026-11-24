import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";
const directory = path.dirname(fileURLToPath(import.meta.url));
async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (id BIGSERIAL PRIMARY KEY, filename TEXT NOT NULL UNIQUE, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    const result = await client.query("SELECT filename FROM schema_migrations");
    const applied = new Set(result.rows.map((row) => row.filename));
    const names = (await readdir(path.join(directory, "migrations"))).filter((name) => name.endsWith(".sql")).sort();
    for (const filename of names) {
      if (applied.has(filename)) continue;
      const sql = await readFile(path.join(directory, "migrations", filename), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
        await client.query("COMMIT");
        console.info(`Applied migration: ${filename}`);
      } catch (error) { await client.query("ROLLBACK"); throw error; }
    }
  } finally { client.release(); await pool.end(); }
}
runMigrations().catch(async (error) => { console.error("Database migration failed:", error.message); await pool.end(); process.exitCode = 1; });
