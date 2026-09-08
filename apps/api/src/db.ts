import pg from "pg";
import { readFileSync } from "node:fs";
import { config } from "./config.js";

const { Pool } = pg;

export const db = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl.includes("supabase.com")
    ? { rejectUnauthorized: true, ...(config.databaseCaCert ? { ca: readFileSync(config.databaseCaCert, "utf8") } : {}) }
    : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000
});

db.on("error", (error) => console.error("Error inesperado en PostgreSQL", error));

export async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
