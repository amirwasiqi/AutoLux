import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./database/pool.js";
const server = app.listen(env.port, () => console.info(`AutoLux API listening on port ${env.port}`));
async function shutdown(signal) {
  console.info(`${signal} received. Closing server gracefully.`);
  server.close(async () => { await pool.end(); process.exit(0); });
  setTimeout(() => { console.error("Graceful shutdown timed out."); process.exit(1); }, 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
