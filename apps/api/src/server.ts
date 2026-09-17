import cron from "node-cron";
import { app } from "./app.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { sendDueReminders, processNotificationQueue } from "./notifications.js";

const server = app.listen(config.port, () => {
  console.log(`Alcívar Legal API disponible en http://localhost:${config.port}`);
});

let processingMail = false;
cron.schedule("* * * * *", async () => {
  if (processingMail) return;
  processingMail = true;
  try { await processNotificationQueue(); } catch { console.error("No se pudo procesar la cola de correo"); }
  finally { processingMail = false; }
});

cron.schedule("*/15 * * * *", () => {
  sendDueReminders().catch((error) => console.error("Error al procesar recordatorios", error));
}, { timezone: "America/Guayaquil" });

const shutdown = async () => {
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
