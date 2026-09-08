import { config } from "../config.js";
import { db } from "../db.js";

const baseUrl = `http://localhost:${config.port}`;
let reference = "";

function nextWeekday() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  for (let i = 1; i <= 14; i++) {
    const candidate = new Date(date);
    candidate.setDate(date.getDate() + i);
    if (candidate.getDay() >= 1 && candidate.getDay() <= 5) return candidate.toISOString().slice(0, 10);
  }
  throw new Error("No se encontró un día hábil");
}

async function run() {
  if (!config.adminSeedPassword) throw new Error("Falta ADMIN_SEED_PASSWORD para probar el acceso ADMIN");
  const health = await fetch(`${baseUrl}/api/health`).then((response) => response.json()) as { ok?: boolean };
  if (!health.ok) throw new Error("Health check falló");
  const date = nextWeekday();
  const availability = await fetch(`${baseUrl}/api/public/availability?date=${date}`).then((response) => response.json()) as { slots: { time: string }[] };
  if (!availability.slots.length) throw new Error("No se encontraron horarios de prueba");
  const response = await fetch(`${baseUrl}/api/public/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientName: "Prueba automática Alcívar",
      clientEmail: "prueba@example.com",
      clientPhone: "0999999999",
      date,
      time: availability.slots[0].time,
      practiceArea: "Prueba del sistema",
      reason: "Verificación automática del flujo de agenda.",
      privacyAccepted: true,
      website: ""
    })
  });
  const appointment = await response.json() as { reference?: string; whatsappUrl?: string; error?: string };
  if (!response.ok || !appointment.reference || !appointment.whatsappUrl) throw new Error(appointment.error ?? "La cita de prueba falló");
  reference = appointment.reference;
  const loginResponse = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: config.adminSeedEmail, password: config.adminSeedPassword })
  });
  if (!loginResponse.ok) throw new Error("El inicio de sesión ADMIN falló");
  console.log("✓ Salud, disponibilidad, creación de cita, WhatsApp y sesión ADMIN verificados");
}

run()
  .finally(async () => {
    if (reference) {
      await db.query("DELETE FROM email_events WHERE appointment_id IN (SELECT id FROM appointments WHERE reference_code = $1)", [reference]);
      await db.query("DELETE FROM appointments WHERE reference_code = $1", [reference]);
    }
    await db.end();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
