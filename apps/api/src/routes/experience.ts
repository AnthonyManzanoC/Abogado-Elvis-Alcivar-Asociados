import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { encryptSecret, requireAdmin } from "../security.js";
import { isHttpsUrl } from "../settings-schema.js";
import { sendSmtpTest } from "../notifications.js";

export const experienceRouter = Router();
experienceRouter.use(requireAdmin);
const imageUrl = z.string().trim().max(1500).refine(v => !v || isHttpsUrl(v) || /^\/(images|uploads)\/[a-zA-Z0-9._-]+$/.test(v) || /^http:\/\/localhost:\d+\/uploads\/[a-zA-Z0-9._-]+$/.test(v), "URL de imagen inválida");
const schema = z.object({
  hero_image_url: imageUrl, profile_image_url: imageUrl,
  results_phrase: z.string().trim().min(3).max(200), rights_phrase: z.string().trim().min(3).max(200), assistant_enabled: z.boolean(),
  mail_provider: z.enum(["smtp", "brevo"]), brevoApiKey: z.string().trim().max(500).optional().default(""),
  brevo_sender_email: z.union([z.literal(""), z.email()]), brevo_sender_name: z.string().trim().min(2).max(150),
  contact_email: z.union([z.literal(""), z.email()]),
  public_site_url: z.string().trim().max(300).refine(v => !v || isHttpsUrl(v) || /^http:\/\/localhost:\d+$/.test(v), "Usa la URL HTTPS pública de la web"),
  virtual_enabled: z.boolean(), virtual_fee: z.coerce.number().min(0).max(100000),
  payment_instructions: z.string().trim().max(2500), payments_test_mode: z.boolean()
}).refine(s => !s.virtual_enabled || (s.virtual_fee > 0 && s.payment_instructions.length >= 10), "Para activar citas virtuales, completa el valor y las instrucciones de pago");
const columns = "hero_image_url,profile_image_url,results_phrase,rights_phrase,assistant_enabled,mail_provider,brevo_sender_email,brevo_sender_name,contact_email,public_site_url,virtual_enabled,virtual_fee,payment_instructions,payments_test_mode,(brevo_api_key_encrypted<>'') AS \"brevoConfigured\"";
experienceRouter.get("/experience", async (_req,res) => res.json((await db.query("SELECT " + columns + " FROM site_settings WHERE id=1")).rows[0]));
experienceRouter.put("/experience", async (req,res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const s = parsed.data;
  if (s.brevoApiKey && !/^xkeysib-[A-Za-z0-9-]+$/.test(s.brevoApiKey)) return res.status(400).json({ error: "Clave API de Brevo inválida" });
  if (s.mail_provider === "brevo" && !s.brevo_sender_email) return res.status(400).json({ error: "Completa el correo remitente autorizado en Brevo" });
  const { rows } = await db.query("UPDATE site_settings SET hero_image_url=$1,profile_image_url=$2,results_phrase=$3,rights_phrase=$4,assistant_enabled=$5,mail_provider=$6,brevo_api_key_encrypted=COALESCE($7,brevo_api_key_encrypted),brevo_sender_email=$8,brevo_sender_name=$9,contact_email=$10,public_site_url=$11,virtual_enabled=$12,virtual_fee=$13,payment_instructions=$14,payments_test_mode=$15,updated_at=NOW() WHERE id=1 RETURNING " + columns,
    [s.hero_image_url,s.profile_image_url,s.results_phrase,s.rights_phrase,s.assistant_enabled,s.mail_provider,s.brevoApiKey ? encryptSecret(s.brevoApiKey) : null,s.brevo_sender_email,s.brevo_sender_name,s.contact_email,s.public_site_url.replace(/\/$/,""),s.virtual_enabled,s.virtual_fee,s.payment_instructions,s.payments_test_mode]);
  res.json(rows[0]);
});
experienceRouter.post("/experience/test-mail", async (req,res) => {
  const parsed = z.object({ recipient: z.email() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Correo de prueba inválido" });
  const result = await sendSmtpTest(parsed.data.recipient);
  res.status(result.sent ? 200 : 400).json(result.sent ? result : { error: result.reason });
});
experienceRouter.get("/mail-jobs", async (_req,res) => {
  res.json((await db.query("SELECT id,recipient,event_type,status,attempts,last_error,provider_message_id,created_at FROM notification_jobs ORDER BY created_at DESC LIMIT 100")).rows);
});
experienceRouter.post("/mail-jobs/:id/retry", async (req,res) => {
  if (!z.uuid().safeParse(req.params.id).success) return res.status(400).json({ error: "Identificador inválido" });
  const result = await db.query("UPDATE notification_jobs SET status='pending',attempts=0,next_attempt_at=NOW(),updated_at=NOW() WHERE id=$1 AND status='failed'",[req.params.id]);
  if (!result.rowCount) return res.status(409).json({ error: "Solo se pueden reintentar envíos fallidos" });
  res.json({ ok:true });
});
