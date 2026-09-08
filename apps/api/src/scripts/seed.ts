import bcrypt from "bcryptjs";
import { config } from "../config.js";
import { db } from "../db.js";

async function seed() {
  if (!config.adminSeedPassword) throw new Error("Falta ADMIN_SEED_PASSWORD para crear el administrador inicial");
  const passwordHash = await bcrypt.hash(config.adminSeedPassword, 12);
  const result = await db.query(
    `INSERT INTO admins (email, password_hash, full_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [config.adminSeedEmail, passwordHash, "Administración Alcívar Legal"]
  );
  console.log(result.rowCount ? "✓ Administrador inicial creado" : "✓ El administrador inicial ya existe");
}

seed()
  .then(async () => {
    await db.end();
  })
  .catch(async (error) => {
    console.error("No fue posible sembrar los datos", error);
    await db.end();
    process.exit(1);
  });
