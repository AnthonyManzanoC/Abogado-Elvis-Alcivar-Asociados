import { mkdir } from "node:fs/promises";
import { extname } from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import multer from "multer";
import { z } from "zod";
import { config } from "../config.js";
import { db, withTransaction } from "../db.js";
import { sendSmtpTest } from "../notifications.js";
import { encryptSecret, requireAdmin, signAdminToken } from "../security.js";
import { slugify } from "../utils.js";
import { availabilitySchema, settingsSchema } from "../settings-schema.js";

await mkdir(config.uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: config.uploadsDir,
  filename: (_req, file, callback) => {
    const extension = extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
    callback(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const acceptedMimeTypes = new Set([
      "image/jpeg", "image/png", "image/webp",
      "video/mp4", "video/webm", "video/quicktime"
    ]);
    const accepted = acceptedMimeTypes.has(file.mimetype);
    if (!accepted) return callback(new Error("Solo se permiten imágenes y videos"));
    callback(null, true);
  }
});

export const adminRouter = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });

adminRouter.post("/login", loginLimiter, async (req, res) => {
  const parsed = z.object({ email: z.email(), password: z.string().min(8).max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Credenciales inválidas" });
  const { rows } = await db.query("SELECT * FROM admins WHERE email = $1", [parsed.data.email.toLowerCase()]);
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(parsed.data.password, admin.password_hash))) {
    return res.status(401).json({ error: "Correo o contraseña incorrectos" });
  }
  await db.query("UPDATE admins SET last_login_at = NOW() WHERE id = $1", [admin.id]);
  res.json({
    token: signAdminToken({ sub: admin.id, email: admin.email, role: "admin" }),
    admin: { id: admin.id, email: admin.email, fullName: admin.full_name, mustChangePassword: admin.must_change_password }
  });
});

adminRouter.use(requireAdmin);

adminRouter.get("/me", async (_req, res) => {
  const { rows } = await db.query("SELECT id, email, full_name, must_change_password, last_login_at FROM admins WHERE id = $1", [res.locals.admin.sub]);
  res.json(rows[0]);
});

adminRouter.put("/password", async (req, res) => {
  const parsed = z.object({ currentPassword: z.string().min(8), newPassword: z.string().min(12).max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "La nueva contraseña debe tener al menos 12 caracteres" });
  const { rows } = await db.query("SELECT password_hash FROM admins WHERE id = $1", [res.locals.admin.sub]);
  if (!rows[0] || !(await bcrypt.compare(parsed.data.currentPassword, rows[0].password_hash))) {
    return res.status(400).json({ error: "La contraseña actual no coincide" });
  }
  await db.query("UPDATE admins SET password_hash = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2", [await bcrypt.hash(parsed.data.newPassword, 12), res.locals.admin.sub]);
  res.json({ ok: true });
});

adminRouter.get("/dashboard", async (_req, res) => {
  const [totals, upcoming, recentEmails] = await Promise.all([
    db.query(`SELECT
      COUNT(*) FILTER (WHERE status IN ('scheduled','confirmed') AND starts_at >= NOW())::int AS upcoming,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS this_month,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
      FROM appointments`),
    db.query(`SELECT id, reference_code, client_name, client_phone, starts_at, practice_area, status
              FROM appointments WHERE starts_at >= NOW() AND status IN ('scheduled','confirmed')
              ORDER BY starts_at LIMIT 6`),
    db.query(`SELECT event_type, recipient, status, created_at FROM email_events ORDER BY created_at DESC LIMIT 8`)
  ]);
  res.json({ totals: totals.rows[0], upcoming: upcoming.rows, recentEmails: recentEmails.rows });
});

adminRouter.get("/appointments", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const values: unknown[] = [];
  let where = "TRUE";
  if (status) {
    values.push(status);
    where += ` AND status = $${values.length}`;
  }
  const { rows } = await db.query(`SELECT * FROM appointments WHERE ${where} ORDER BY starts_at DESC LIMIT 300`, values);
  res.json(rows);
});

adminRouter.patch("/appointments/:id", async (req, res) => {
  const parsed = z.object({
    status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]),
    internalNotes: z.string().max(2000).optional().default("")
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Actualización inválida" });
  const { rows } = await db.query(
    `UPDATE appointments SET status = $1, internal_notes = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [parsed.data.status, parsed.data.internalNotes, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Cita no encontrada" });
  res.json(rows[0]);
});

adminRouter.get("/publications", async (_req, res) => {
  const { rows } = await db.query("SELECT * FROM publications ORDER BY created_at DESC");
  res.json(rows);
});

const publicationSchema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().max(100).optional().default(""),
  excerpt: z.string().trim().max(300).optional().default(""),
  body: z.string().trim().max(20000).optional().default(""),
  kind: z.enum(["article", "case", "video", "photo", "news"]),
  platform: z.enum(["website", "instagram", "tiktok", "youtube", "facebook"]),
  mediaUrl: z.string().trim().max(1000).optional().default(""),
  thumbnailUrl: z.string().trim().max(1000).optional().default(""),
  externalUrl: z.string().trim().max(1000).optional().default(""),
  featured: z.boolean().optional().default(false),
  status: z.enum(["draft", "published", "archived"]),
  legalDisclaimer: z.string().trim().max(500).optional().default("")
});

adminRouter.post("/publications", async (req, res) => {
  const parsed = publicationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Revisa la publicación", details: parsed.error.flatten() });
  const p = parsed.data;
  const slug = slugify(p.slug || p.title);
  const { rows } = await db.query(
    `INSERT INTO publications (slug, title, excerpt, body, kind, platform, media_url, thumbnail_url, external_url, featured, status, legal_disclaimer, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, CASE WHEN $11 = 'published' THEN NOW() ELSE NULL END) RETURNING *`,
    [slug, p.title, p.excerpt, p.body, p.kind, p.platform, p.mediaUrl, p.thumbnailUrl, p.externalUrl, p.featured, p.status, p.legalDisclaimer]
  );
  res.status(201).json(rows[0]);
});

adminRouter.put("/publications/:id", async (req, res) => {
  const parsed = publicationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Revisa la publicación", details: parsed.error.flatten() });
  const p = parsed.data;
  const slug = slugify(p.slug || p.title);
  const { rows } = await db.query(
    `UPDATE publications SET slug=$1,title=$2,excerpt=$3,body=$4,kind=$5,platform=$6,media_url=$7,thumbnail_url=$8,
      external_url=$9,featured=$10,status=$11,legal_disclaimer=$12,
      published_at=CASE WHEN $11='published' THEN COALESCE(published_at,NOW()) ELSE published_at END,updated_at=NOW()
     WHERE id=$13 RETURNING *`,
    [slug, p.title, p.excerpt, p.body, p.kind, p.platform, p.mediaUrl, p.thumbnailUrl, p.externalUrl, p.featured, p.status, p.legalDisclaimer, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Publicación no encontrada" });
  res.json(rows[0]);
});

adminRouter.delete("/publications/:id", async (req, res) => {
  const { rowCount } = await db.query("DELETE FROM publications WHERE id = $1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Publicación no encontrada" });
  res.status(204).end();
});

adminRouter.get("/services", async (_req, res) => {
  const { rows } = await db.query("SELECT * FROM services ORDER BY display_order, title");
  res.json(rows);
});

const serviceSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(100).optional().default(""),
  summary: z.string().trim().min(5).max(300),
  description: z.string().trim().max(5000).optional().default(""),
  icon: z.string().trim().max(40).optional().default("scale"),
  displayOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
  active: z.boolean().optional().default(true)
});

adminRouter.post("/services", async (req, res) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Revisa el servicio" });
  const s = parsed.data;
  const { rows } = await db.query(
    `INSERT INTO services (slug,title,summary,description,icon,display_order,active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [slugify(s.slug || s.title), s.title, s.summary, s.description, s.icon, s.displayOrder, s.active]
  );
  res.status(201).json(rows[0]);
});

adminRouter.put("/services/:id", async (req, res) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Revisa el servicio" });
  const s = parsed.data;
  const { rows } = await db.query(
    `UPDATE services SET slug=$1,title=$2,summary=$3,description=$4,icon=$5,display_order=$6,active=$7,updated_at=NOW() WHERE id=$8 RETURNING *`,
    [slugify(s.slug || s.title), s.title, s.summary, s.description, s.icon, s.displayOrder, s.active, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Servicio no encontrado" });
  res.json(rows[0]);
});

adminRouter.delete("/services/:id", async (req, res) => {
  const { rowCount } = await db.query("DELETE FROM services WHERE id=$1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Servicio no encontrado" });
  res.status(204).end();
});

adminRouter.get("/settings", async (_req, res) => {
  const { rows } = await db.query("SELECT * FROM site_settings WHERE id = 1");
  const settings = rows[0];
  const { smtp_password_encrypted, ...safe } = settings;
  res.json({ ...safe, smtpPasswordConfigured: Boolean(smtp_password_encrypted) });
});

adminRouter.put("/settings", async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Revisa la configuración", details: parsed.error.flatten() });
  const s = parsed.data;
  const encryptedPassword = s.smtpPassword ? encryptSecret(s.smtpPassword) : null;
  const settings = await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(8742301)");
    const { rows } = await client.query(
    `UPDATE site_settings SET
      firm_name=$1,logo_url=$2,attorney_name=$3,professional_title=$4,tagline=$5,biography=$6,phone=$7,whatsapp_number=$8,
      contact_email=$9,office_address=$10,maps_url=$11,instagram_url=$12,tiktok_url=$13,office_hours_note=$14,
      consultation_minutes=$15,smtp_host=$16,smtp_port=$17,smtp_secure=$18,smtp_user=$19,
      smtp_password_encrypted=COALESCE($20,smtp_password_encrypted),smtp_from_email=$21,smtp_from_name=$22,
      notify_attorney=$23,notify_client=$24,reminders_enabled=$25,
      map_enabled=COALESCE($26,map_enabled),map_embed_url=COALESCE($27,map_embed_url),
      map_query=COALESCE($28,map_query),map_load_on_click=COALESCE($29,map_load_on_click),
      office_directions=COALESCE($30,office_directions),contact_heading=COALESCE($31,contact_heading),
      contact_intro=COALESCE($32,contact_intro),whatsapp_message=COALESCE($33,whatsapp_message),updated_at=NOW()
     WHERE id=1 RETURNING *`,
    [s.firmName,s.logoUrl,s.attorneyName,s.professionalTitle,s.tagline,s.biography,s.phone,s.whatsappNumber,s.contactEmail,s.officeAddress,s.mapsUrl,s.instagramUrl,s.tiktokUrl,s.officeHoursNote,s.consultationMinutes,s.smtpHost,s.smtpPort,s.smtpSecure,s.smtpUser,encryptedPassword,s.smtpFromEmail,s.smtpFromName,s.notifyAttorney,s.notifyClient,s.remindersEnabled,s.mapEnabled??null,s.mapEmbedUrl??null,s.mapQuery??null,s.mapLoadOnClick??null,s.officeDirections??null,s.contactHeading??null,s.contactIntro??null,s.whatsappMessage??null]
    );
    if (!rows[0]) throw new Error("Configuración del despacho no encontrada");
    if (s.availability) {
      await client.query("DELETE FROM availability");
      for (const item of s.availability) {
        await client.query("INSERT INTO availability (day_of_week,start_time,end_time,slot_minutes,active) VALUES ($1,$2,$3,$4,$5)", [item.dayOfWeek,item.startTime,item.endTime,item.slotMinutes,item.active]);
      }
    }
    return rows[0];
  });
  const { smtp_password_encrypted, ...safe } = settings;
  res.json({ ...safe, smtpPasswordConfigured: Boolean(smtp_password_encrypted) });
});

adminRouter.post("/settings/test-smtp", async (req, res) => {
  const parsed = z.object({ recipient: z.email() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Correo de prueba inválido" });
  const result = await sendSmtpTest(parsed.data.recipient);
  if (!result.sent) return res.status(400).json({ error: result.reason });
  res.json({ ok: true });
});

adminRouter.get("/availability", async (_req, res) => {
  const { rows } = await db.query("SELECT * FROM availability ORDER BY day_of_week, start_time");
  res.json(rows);
});

adminRouter.put("/availability", async (req, res) => {
  const parsed = availabilitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Disponibilidad inválida" });
  await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(8742301)");
    await client.query("DELETE FROM availability");
    for (const item of parsed.data) {
      await client.query(
        "INSERT INTO availability (day_of_week,start_time,end_time,slot_minutes,active) VALUES ($1,$2,$3,$4,$5)",
        [item.dayOfWeek,item.startTime,item.endTime,item.slotMinutes,item.active]
      );
    }
  });
  res.json({ ok: true });
});

adminRouter.post("/uploads", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Selecciona un archivo" });
  res.status(201).json({
    url: `${config.publicApiUrl.replace(/\/$/, "")}/uploads/${req.file.filename}`,
    filename: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size
  });
});
