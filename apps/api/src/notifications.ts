import nodemailer from "nodemailer";
import { db } from "./db.js";
import { decryptSecret } from "./security.js";

type Settings = {
  attorney_name: string;
  contact_email: string;
  office_address: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password_encrypted: string;
  smtp_from_email: string;
  smtp_from_name: string;
  notify_attorney: boolean;
  notify_client: boolean;
  reminders_enabled: boolean;
};

type Appointment = {
  id: string;
  reference_code: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  practice_area: string;
  reason: string;
  starts_at: string | Date;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character] ?? character);

const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat("es-EC", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Guayaquil"
  }).format(new Date(value));

async function getSettings(): Promise<Settings> {
  const { rows } = await db.query("SELECT * FROM site_settings WHERE id = 1");
  return rows[0];
}

function makeTransport(settings: Settings) {
  if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password_encrypted) return null;
  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port,
    secure: settings.smtp_secure,
    auth: {
      user: settings.smtp_user,
      pass: decryptSecret(settings.smtp_password_encrypted)
    }
  });
}

async function logEmail(
  appointmentId: string | null,
  recipient: string,
  eventType: string,
  status: "sent" | "skipped" | "failed",
  errorMessage = ""
) {
  await db.query(
    `INSERT INTO email_events (appointment_id, recipient, event_type, status, error_message)
     VALUES ($1, $2, $3, $4, $5)`,
    [appointmentId, recipient, eventType, status, errorMessage.slice(0, 600)]
  );
}

async function deliver(
  settings: Settings,
  appointmentId: string | null,
  recipient: string,
  eventType: string,
  subject: string,
  html: string
) {
  const transport = makeTransport(settings);
  if (!transport) {
    await logEmail(appointmentId, recipient || "sin-destinatario", eventType, "skipped", "SMTP no configurado");
    return { sent: false, reason: "SMTP no configurado" };
  }
  try {
    await transport.sendMail({
      from: `"${settings.smtp_from_name}" <${settings.smtp_from_email || settings.smtp_user}>`,
      to: recipient,
      subject,
      html
    });
    await logEmail(appointmentId, recipient, eventType, "sent");
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error SMTP";
    await logEmail(appointmentId, recipient, eventType, "failed", message);
    return { sent: false, reason: message };
  }
}

function emailShell(title: string, content: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f1e8;font-family:Arial,sans-serif;color:#12231d">
  <div style="max-width:620px;margin:0 auto;padding:40px 20px">
    <div style="background:#0b211b;color:#f8f3e8;padding:26px 30px;border-radius:18px 18px 0 0">
      <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c6a76b">Alcívar Legal</div>
      <h1 style="font:28px Georgia,serif;margin:8px 0 0">${title}</h1>
    </div>
    <div style="background:#fff;padding:30px;border-radius:0 0 18px 18px;border:1px solid #e7e0d1">${content}
      <p style="font-size:12px;color:#66736e;margin-top:28px">Mensaje informativo. La reserva no crea por sí sola una relación abogado-cliente.</p>
    </div>
  </div></body></html>`;
}

export async function sendAppointmentNotifications(appointment: Appointment) {
  const settings = await getSettings();
  const when = formatDate(appointment.starts_at);
  const safeName = escapeHtml(appointment.client_name);
  const safeReason = escapeHtml(appointment.reason);
  const safeArea = escapeHtml(appointment.practice_area);

  const jobs: Promise<unknown>[] = [];
  if (settings.notify_attorney && settings.contact_email) {
    jobs.push(deliver(
      settings,
      appointment.id,
      settings.contact_email,
      "appointment_created_attorney",
      `Nueva cita ${appointment.reference_code}`,
      emailShell("Nueva cita agendada", `<p><strong>${safeName}</strong> reservó una consulta para <strong>${when}</strong>.</p><p>Área: ${safeArea}<br>Teléfono: ${escapeHtml(appointment.client_phone)}<br>Motivo: ${safeReason}</p><p>Código: <strong>${appointment.reference_code}</strong></p>`)
    ));
  }
  if (settings.notify_client && appointment.client_email) {
    jobs.push(deliver(
      settings,
      appointment.id,
      appointment.client_email,
      "appointment_created_client",
      `Confirmación de cita ${appointment.reference_code}`,
      emailShell("Tu cita fue registrada", `<p>Hola <strong>${safeName}</strong>, recibimos tu solicitud para <strong>${when}</strong>.</p><p>Lugar: ${escapeHtml(settings.office_address)}.</p><p>Conserva tu código: <strong>${appointment.reference_code}</strong>.</p>`)
    ));
  }
  await Promise.allSettled(jobs);
}

export async function sendDueReminders() {
  const settings = await getSettings();
  if (!settings.reminders_enabled) return;
  const { rows } = await db.query<Appointment>(
    `SELECT * FROM appointments
     WHERE status IN ('scheduled', 'confirmed')
       AND reminder_sent_at IS NULL
       AND starts_at BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'`
  );
  for (const appointment of rows) {
    const when = formatDate(appointment.starts_at);
    const content = emailShell("Recordatorio de cita", `<p>La cita <strong>${appointment.reference_code}</strong> está programada para <strong>${when}</strong>.</p><p>Lugar: ${escapeHtml(settings.office_address)}.</p>`);
    const jobs: Promise<unknown>[] = [];
    if (settings.notify_client && appointment.client_email) {
      jobs.push(deliver(settings, appointment.id, appointment.client_email, "appointment_reminder_client", `Recordatorio: cita mañana ${appointment.reference_code}`, content));
    }
    if (settings.notify_attorney && settings.contact_email) {
      jobs.push(deliver(settings, appointment.id, settings.contact_email, "appointment_reminder_attorney", `Recordatorio: cita mañana ${appointment.reference_code}`, content));
    }
    await Promise.allSettled(jobs);
    await db.query("UPDATE appointments SET reminder_sent_at = NOW(), updated_at = NOW() WHERE id = $1", [appointment.id]);
  }
}

export async function sendSmtpTest(recipient: string) {
  const settings = await getSettings();
  return deliver(
    settings,
    null,
    recipient,
    "smtp_test",
    "Prueba SMTP · Alcívar Legal",
    emailShell("Configuración correcta", "<p>El sistema puede enviar confirmaciones y recordatorios desde esta cuenta.</p>")
  );
}
