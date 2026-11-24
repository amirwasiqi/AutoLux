import dotenv from "dotenv";
dotenv.config();
const readBoolean = (value, fallback = false) => value === undefined || value === "" ? fallback : value.toLowerCase() === "true";
const readNumber = (value, fallback) => { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; };
export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: readNumber(process.env.PORT, 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL || "",
  databaseSsl: readBoolean(process.env.DATABASE_SSL),
  dbPoolMax: readNumber(process.env.DB_POOL_MAX, 10),
  dbIdleTimeoutMs: readNumber(process.env.DB_IDLE_TIMEOUT_MS, 30000),
  dbConnectionTimeoutMs: readNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 5000)
};
if (env.nodeEnv === "production" && !env.databaseUrl) throw new Error("DATABASE_URL is required in production.");
