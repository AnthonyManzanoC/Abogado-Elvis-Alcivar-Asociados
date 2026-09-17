import nodemailer from "nodemailer";
import type pg from "pg";
import { db, withTransaction } from "./db.js";
import { config } from "./config.js";
import { decryptSecret, encryptSecret } from "./security.js";

type Query = Pick<pg.PoolClient, "query">;
type RecordData = Record<string, any>;
export const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c] ?? c);
const labels: Record<string, string> = { scheduled: "Agendada", confirmed: "Confirmada", cancelled: "Cancelada", completed: "Completada", no_show: "No asistió", new: "Recibida", in_review: "En revisión", answered: "Respondida", closed: "Cerrada", pending: "Pendiente", submitted: "Comprobante en revisión", approved: "Pago aprobado", rejected: "Comprobante rechazado", not_required: "No requerido" };
const formatDate = (value: string | Date) => new Intl.DateTimeFormat("es-EC", { dateStyle: "full", timeStyle: "short", timeZone: "America/Guayaquil" }).format(new Date(value));

export function publicSiteUrl(settings: RecordData) {
  return String(settings.public_site_url || config.frontendUrls[0]).replace(/\/$/, "");
}
export function trackingLink(settings: RecordData, token: string) {
  return publicSiteUrl(settings) + "/seguimiento#token=" + encodeURIComponent(token);
}
function emailShell(settings: RecordData, title: string, content: string) {
  return '<!doctype html><html lang="es"><body style="margin:0;background:#f3eee3;font-family:Arial,sans-serif;color:#10231d"><div style="max-width:620px;margin:auto;padding:32px 16px"><header style="background:#0a1d17;color:#fff;padding:28px"><p style="color:#dfc083">' + escapeHtml(settings.attorney_name) + '</p><h1 style="font:28px Georgia,serif">' + escapeHtml(title) + '</h1></header><main style="background:white;padding:28px;line-height:1.7">' + content + '<p style="font-size:12px;color:#65716c">Mensaje de ' + escapeHtml(settings.firm_name) + '. No respondas con documentos sensibles. Una solicitud no constituye por sí sola una relación abogado-cliente.</p></main></div></body></html>';
}
function button(url: string, label: string) {
  return '<p><a style="display:inline-block;padding:12px 22px;background:#0a1d17;color:#fff;text-decoration:none" href="' + escapeHtml(url) + '">' + escapeHtml(label) + '</a></p>';
}
export async function enqueueRecordNotifications(client: Query, kind: "appointment" | "consultation", record: RecordData, event: string, title: string) {
  const settings = (await client.query("SELECT * FROM site_settings WHERE id=1")).rows[0];
  const token = record.tracking_token_encrypted ? decryptSecret(record.tracking_token_encrypted) : "";
  const details = '<p>Referencia: <strong>' + escapeHtml(record.reference_code) + '</strong><br>Estado: <strong>' + escapeHtml(labels[record.status] ?? record.status) + '</strong>' +
    (record.starts_at ? '<br>Fecha: ' + escapeHtml(formatDate(record.starts_at)) + '<br>Modalidad: ' + escapeHtml(record.modality) : "") +
    (record.modality === "virtual" ? '<br>Pago: ' + escapeHtml(labels[record.payment_status]) + (record.payment_test_mode ? '<br><strong>MODO DE PRUEBA. No realices transferencias.</strong>' : '') : "") + '</p>';
  for (const recipientType of ["client", "attorney"]) {
    const recipient = recipientType === "client" ? record.client_email : settings.contact_email;
    if (!recipient || !(recipientType === "client" ? settings.notify_client : settings.notify_attorney)) continue;
    const url = recipientType === "client" && token ? trackingLink(settings, token) : publicSiteUrl(settings) + (recipientType === "attorney" ? "/admin" : "/contacto");
    const html = emailShell(settings, title, '<p>' + (recipientType === "client" ? "Hola " + escapeHtml(record.client_name) + "." : "Hay una actualización de atención del despacho.") + '</p>' + details +
      button(url, recipientType === "client" ? "Ver seguimiento de mi solicitud" : "Revisar en ADMIN") +
      (recipientType === "client" ? '<p>Conserva este enlace privado para regresar, consultar actualizaciones y subir tu comprobante si corresponde. No lo compartas. Caduca a los 90 días de la solicitud o de la cita.</p>' : ""));
    await client.query("INSERT INTO notification_jobs (dedup_key,appointment_id,consultation_id,recipient,event_type,payload_encrypted) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (dedup_key) DO NOTHING",
      [kind + ":" + record.id + ":" + event + ":" + recipientType, kind === "appointment" ? record.id : null, kind === "consultation" ? record.id : null, recipient, event + "_" + recipientType, encryptSecret(JSON.stringify({ subject: title + " · " + record.reference_code, html }))]);
  }
}

async function deliver(settings: RecordData, recipient: string, subject: string, html: string) {
  if (settings.mail_provider === "brevo") {
    if (!settings.brevo_api_key_encrypted || !settings.brevo_sender_email) throw new Error("Brevo no configurado: falta clave o remitente");
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": decryptSecret(settings.brevo_api_key_encrypted), "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sender: { name: settings.brevo_sender_name || settings.attorney_name, email: settings.brevo_sender_email }, to: [{ email: recipient }], subject, htmlContent: html, ...(settings.contact_email ? { replyTo: { email: settings.contact_email, name: settings.attorney_name } } : {}) }),
      signal: AbortSignal.timeout(25000)
    });
    if (!response.ok) throw new Error("Brevo rechazó el envío (HTTP " + response.status + "). Revisa la clave, el remitente y el saldo en ADMIN.");
    const result = await response.json() as { messageId?: string };
    if (!result.messageId) throw new Error("Brevo no devolvió identificador del mensaje");
    return result.messageId;
  }
  if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password_encrypted) throw new Error("SMTP no configurado");
  const transport = nodemailer.createTransport({ host: settings.smtp_host, port: settings.smtp_port, secure: settings.smtp_secure,
    connectionTimeout: 15000, socketTimeout: 25000, auth: { user: settings.smtp_user, pass: decryptSecret(settings.smtp_password_encrypted) } });
  try {
    const result = await transport.sendMail({ from: { name: settings.smtp_from_name || settings.attorney_name, address: settings.smtp_from_email || settings.smtp_user }, to: recipient, subject, html });
    return String(result.messageId);
  } finally { transport.close(); }
}
function safeMailError(error: unknown) {
  if (error instanceof Error && /^(Brevo |SMTP no configurado)/.test(error.message)) return error.message;
  return "No fue posible contactar al proveedor de correo. Revisa conexión, credenciales y configuración.";
}
export async function processNotificationQueue(limit = 10) {
  if (process.env.MAIL_DELIVERY_DISABLED === "true") return;
  const settings = (await db.query("SELECT * FROM site_settings WHERE id=1")).rows[0];
  for (let i = 0; i < limit; i++) {
    const { rows } = await db.query("UPDATE notification_jobs SET status='sending',locked_at=NOW(),attempts=attempts+1,updated_at=NOW() WHERE id=(SELECT id FROM notification_jobs WHERE (status='pending' AND next_attempt_at<=NOW()) OR (status='sending' AND locked_at<NOW()-INTERVAL '5 minutes') ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *");
    const job = rows[0]; if (!job) break;
    try {
      const payload = JSON.parse(decryptSecret(job.payload_encrypted)) as { subject: string; html: string };
      const messageId = await deliver(settings, job.recipient, payload.subject, payload.html);
      await db.query("UPDATE notification_jobs SET status='sent',provider_message_id=$2,last_error='',updated_at=NOW() WHERE id=$1", [job.id, messageId]);
      await db.query("INSERT INTO email_events (appointment_id,recipient,event_type,status) VALUES ($1,$2,$3,'sent')", [job.appointment_id, job.recipient, job.event_type]);
    } catch (error) {
      const reason = safeMailError(error);
      await db.query("UPDATE notification_jobs SET status=$2,last_error=$3,next_attempt_at=NOW()+make_interval(mins=>$4),updated_at=NOW() WHERE id=$1", [job.id, job.attempts >= 5 ? "failed" : "pending", reason, Math.min(60, 2 ** job.attempts)]);
      await db.query("INSERT INTO email_events (appointment_id,recipient,event_type,status,error_message) VALUES ($1,$2,$3,'failed',$4)", [job.appointment_id, job.recipient, job.event_type, reason]);
    }
  }
}
// Legacy export retained; callers should enqueue in the same transaction as the record.
export async function sendAppointmentNotifications(appointment: RecordData) {
  await enqueueRecordNotifications(db, "appointment", appointment, "created", "Tu cita fue registrada");
}
export async function sendDueReminders() {
  const settings = (await db.query("SELECT reminders_enabled FROM site_settings WHERE id=1")).rows[0];
  if (!settings.reminders_enabled) return;
  await withTransaction(async client => {
    const { rows } = await client.query("SELECT * FROM appointments WHERE status IN ('scheduled','confirmed') AND reminder_sent_at IS NULL AND starts_at BETWEEN NOW()+INTERVAL '23 hours' AND NOW()+INTERVAL '25 hours' FOR UPDATE SKIP LOCKED");
    for (const appointment of rows) {
      await enqueueRecordNotifications(client, "appointment", appointment, "reminder", "Recordatorio de tu cita");
      await client.query("UPDATE appointments SET reminder_sent_at=NOW() WHERE id=$1", [appointment.id]);
    }
  });
}
export async function sendSmtpTest(recipient: string) {
  if (process.env.MAIL_DELIVERY_DISABLED === "true") return { sent: false, reason: "Envíos desactivados para pruebas automatizadas" };
  const settings = (await db.query("SELECT * FROM site_settings WHERE id=1")).rows[0];
  try {
    const messageId = await deliver(settings, recipient, "Prueba de notificaciones · " + settings.attorney_name, emailShell(settings, "Prueba de correo del despacho", "<p>Esta es una prueba solicitada desde ADMIN. El sistema puede notificar citas, consultas, comprobantes y cambios de estado con el proveedor configurado.</p><p>No es una cita ni una solicitud de pago.</p>"));
    await db.query("INSERT INTO email_events(recipient,event_type,status) VALUES ($1,'mail_test','sent')", [recipient]);
    return { sent: true, messageId, provider: settings.mail_provider };
  } catch (error) { return { sent: false, reason: safeMailError(error) }; }
}
