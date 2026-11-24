import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { pool } from "./database/pool.js";
export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.frontendOrigin.split(",").map((value) => value.trim()), credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok", service: "autolux-api", timestamp: new Date().toISOString() }));
app.get("/api/ready", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.status(200).json({ status: "ready", database: "connected" }); }
  catch { res.status(503).json({ status: "not_ready", database: "unavailable" }); }
});
app.use("/api", (_req, res) => res.status(404).json({ error: { code: "ROUTE_NOT_FOUND", message: "The requested API route does not exist." } }));
app.use((error, _req, res, _next) => {
  console.error("Unhandled request error:", error.message);
  res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected server error occurred." } });
});
