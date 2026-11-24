import pg from "pg";
import { env } from "../config/env.js";
const { Pool } = pg;
export const pool = new Pool({
  connectionString: env.databaseUrl || undefined,
  max: env.dbPoolMax,
  idleTimeoutMillis: env.dbIdleTimeoutMs,
  connectionTimeoutMillis: env.dbConnectionTimeoutMs,
  ssl: env.databaseSsl ? { rejectUnauthorized: true } : false
});
pool.on("error", (error) => console.error("Unexpected idle PostgreSQL client error:", error.message));
