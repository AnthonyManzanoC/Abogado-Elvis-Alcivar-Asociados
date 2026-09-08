import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db, withTransaction } from "../db.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(currentDir, "../../migrations");

async function migrate() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const applied = await db.query("SELECT 1 FROM schema_migrations WHERE version = $1", [file]);
    if (applied.rowCount) {
      console.log(`✓ ${file} ya aplicada`);
      continue;
    }
    const sql = await readFile(resolve(migrationsDir, file), "utf8");
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
    });
    console.log(`✓ ${file} aplicada`);
  }
}

migrate()
  .then(async () => {
    console.log("Migraciones completadas");
    await db.end();
  })
  .catch(async (error) => {
    console.error("No fue posible ejecutar las migraciones", error);
    await db.end();
    process.exit(1);
  });
