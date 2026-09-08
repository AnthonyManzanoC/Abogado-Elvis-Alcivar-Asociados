import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { db, withTransaction } from "../db.js";
import { sendAppointmentNotifications } from "../notifications.js";
import { makeReference, publicSettingsColumns } from "../utils.js";

export const publicRouter = Router();

const appointmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Inténtalo nuevamente en unos minutos." }
});

const appointmentSchema = z.object({
  clientName: z.string().trim().min(3).max(120),
  clientEmail: z.email().max(180),
  clientPhone: z.string().trim().min(7).max(30),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  practiceArea: z.string().trim().min(2).max(100),
  reason: z.string().trim().min(10).max(1500),
  privacyAccepted: z.literal(true),
  website: z.string().max(0).optional().default("")
});

publicRouter.get("/bootstrap", async (_req, res) => {
  const [settings, services, publications] = await Promise.all([
    db.query(`SELECT ${publicSettingsColumns} FROM site_settings WHERE id = 1`),
    db.query("SELECT * FROM services WHERE active = TRUE ORDER BY display_order, title"),
    db.query(`SELECT id, slug, title, excerpt, body, kind, platform, media_url, thumbnail_url,
                     external_url, featured, legal_disclaimer, published_at
              FROM publications WHERE status = 'published' ORDER BY featured DESC, published_at DESC`)
  ]);
  res.json({ settings: settings.rows[0], services: services.rows, publications: publications.rows });
});

publicRouter.get("/settings", async (_req, res) => {
  const { rows } = await db.query(`SELECT ${publicSettingsColumns} FROM site_settings WHERE id = 1`);
  res.json(rows[0]);
});

publicRouter.get("/services", async (_req, res) => {
  const { rows } = await db.query("SELECT * FROM services WHERE active = TRUE ORDER BY display_order, title");
  res.json(rows);
});

publicRouter.get("/publications", async (req, res) => {
  const kind = typeof req.query.kind === "string" ? req.query.kind : null;
  const values: unknown[] = [];
  let where = "status = 'published'";
  if (kind) {
    values.push(kind);
    where += ` AND kind = $${values.length}`;
  }
  const { rows } = await db.query(
    `SELECT id, slug, title, excerpt, body, kind, platform, media_url, thumbnail_url,
            external_url, featured, legal_disclaimer, published_at
     FROM publications WHERE ${where} ORDER BY featured DESC, published_at DESC`,
    values
  );
  res.json(rows);
});

publicRouter.get("/publications/feed", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 18);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const kind = typeof req.query.kind === "string" && req.query.kind ? req.query.kind : null;
  const values: unknown[] = [];
  let where = "status = 'published'";
  if (kind) {
    values.push(kind);
    where += ` AND kind = $${values.length}`;
  }
  values.push(limit + 1, offset);
  const { rows } = await db.query(
    `SELECT id, slug, title, excerpt, body, kind, platform, media_url, thumbnail_url,
            external_url, featured, legal_disclaimer, published_at
     FROM publications WHERE ${where}
     ORDER BY featured DESC, published_at DESC, id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  const hasMore = rows.length > limit;
  res.json({ items: rows.slice(0, limit), nextOffset: offset + limit, hasMore });
});

publicRouter.get("/publications/:slug", async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, slug, title, excerpt, body, kind, platform, media_url, thumbnail_url,
            external_url, featured, legal_disclaimer, published_at
     FROM publications WHERE slug = $1 AND status = 'published'`,
    [req.params.slug]
  );
  if (!rows[0]) return res.status(404).json({ error: "Publicación no encontrada" });
  res.json(rows[0]);
});

publicRouter.get("/availability", async (req, res) => {
  const date = typeof req.query.date === "string" ? req.query.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Fecha inválida" });
  const day = new Date(`${date}T12:00:00-05:00`).getUTCDay();
  const [availability, appointments, blocked] = await Promise.all([
    db.query(
      `SELECT start_time::text, end_time::text, slot_minutes FROM availability
       WHERE day_of_week = $1 AND active = TRUE ORDER BY start_time`,
      [day]
    ),
    db.query(
      `SELECT starts_at, duration_minutes FROM appointments
       WHERE (starts_at AT TIME ZONE 'America/Guayaquil')::date = $1::date
         AND status IN ('scheduled', 'confirmed')`,
      [date]
    ),
    db.query(
      `SELECT starts_at, ends_at FROM blocked_slots
       WHERE starts_at < ($1::date + INTERVAL '1 day') AT TIME ZONE 'America/Guayaquil'
         AND ends_at > $1::date AT TIME ZONE 'America/Guayaquil'`,
      [date]
    )
  ]);

  const slots: { time: string; label: string }[] = [];
  const now = Date.now();
  for (const window of availability.rows) {
    const [startHour, startMinute] = window.start_time.slice(0, 5).split(":").map(Number);
    const [endHour, endMinute] = window.end_time.slice(0, 5).split(":").map(Number);
    for (let minute = startHour * 60 + startMinute; minute + window.slot_minutes <= endHour * 60 + endMinute; minute += window.slot_minutes) {
      const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
      const startsAt = new Date(`${date}T${time}:00-05:00`);
      const endsAt = new Date(startsAt.getTime() + window.slot_minutes * 60_000);
      const busy = appointments.rows.some((item) => {
        const occupiedStart = new Date(item.starts_at);
        const occupiedEnd = new Date(occupiedStart.getTime() + item.duration_minutes * 60_000);
        return startsAt < occupiedEnd && endsAt > occupiedStart;
      });
      const isBlocked = blocked.rows.some((item) => startsAt < new Date(item.ends_at) && endsAt > new Date(item.starts_at));
      if (!busy && !isBlocked && startsAt.getTime() > now + 30 * 60_000) {
        slots.push({
          time,
          label: new Intl.DateTimeFormat("es-EC", { hour: "numeric", minute: "2-digit", timeZone: "America/Guayaquil" }).format(startsAt)
        });
      }
    }
  }
  res.json({ date, slots });
});

publicRouter.post("/appointments", appointmentLimiter, async (req, res) => {
  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Revisa los datos de la cita", details: parsed.error.flatten() });
  if (parsed.data.website) return res.status(200).json({ ok: true });

  const data = parsed.data;
  const startsAt = new Date(`${data.date}T${data.time}:00-05:00`);
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() + 30 * 60_000) {
    return res.status(400).json({ error: "Selecciona un horario futuro válido" });
  }

  const day = startsAt.getUTCDay();
  const settingsResult = await db.query(
    `SELECT consultation_minutes, whatsapp_number, attorney_name FROM site_settings WHERE id = 1`
  );
  const settings = settingsResult.rows[0];
  const reference = makeReference();
  try {
    const appointment = await withTransaction(async (client) => {
      // Una llave por día elimina la carrera entre dos reservas simultáneas sin bloquear otros días.
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [data.date]);
      const withinSchedule = await client.query(
        `SELECT 1 FROM availability
         WHERE day_of_week = $1 AND active = TRUE
           AND $2::time >= start_time
           AND ($2::time + make_interval(mins => $3::int)) <= end_time
           AND MOD(EXTRACT(EPOCH FROM ($2::time - start_time))::int / 60, slot_minutes) = 0
         LIMIT 1`,
        [day, data.time, settings.consultation_minutes]
      );
      if (!withinSchedule.rowCount) throw new BookingConflictError("Ese horario no está disponible");

      const endsAt = new Date(startsAt.getTime() + settings.consultation_minutes * 60_000).toISOString();
      const conflicts = await client.query(
        `SELECT 1
         WHERE EXISTS (
           SELECT 1 FROM appointments
           WHERE status IN ('scheduled', 'confirmed')
             AND starts_at < $2::timestamptz
             AND starts_at + (duration_minutes * INTERVAL '1 minute') > $1::timestamptz
         ) OR EXISTS (
           SELECT 1 FROM blocked_slots
           WHERE starts_at < $2::timestamptz AND ends_at > $1::timestamptz
         )`,
        [startsAt.toISOString(), endsAt]
      );
      if (conflicts.rowCount) throw new BookingConflictError("El horario acaba de ser reservado. Elige otro.");

      const result = await client.query(
        `INSERT INTO appointments (
          reference_code, client_name, client_email, client_phone, starts_at, duration_minutes,
          practice_area, reason, privacy_accepted_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
        [reference, data.clientName, data.clientEmail.toLowerCase(), data.clientPhone, startsAt.toISOString(), settings.consultation_minutes, data.practiceArea, data.reason]
      );
      return result.rows[0];
    });
    await sendAppointmentNotifications(appointment);
    const message = `Hola ${settings.attorney_name}, agendé una consulta para el ${data.date} a las ${data.time}. Mi nombre es ${data.clientName}. Código: ${reference}.`;
    const whatsappUrl = settings.whatsapp_number
      ? `https://wa.me/${String(settings.whatsapp_number).replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
      : "";
    return res.status(201).json({ ok: true, reference, startsAt: appointment.starts_at, whatsappUrl });
  } catch (error: unknown) {
    if (error instanceof BookingConflictError) return res.status(409).json({ error: error.message });
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return res.status(409).json({ error: "El horario acaba de ser reservado. Elige otro." });
    }
    throw error;
  }
});

class BookingConflictError extends Error {}
