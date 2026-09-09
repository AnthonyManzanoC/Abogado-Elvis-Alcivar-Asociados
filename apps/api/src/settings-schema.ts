import { z } from "zod";

export function isHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

export function isMapEmbedUrl(value: string) {
  if (!isHttpsUrl(value)) return false;
  const url = new URL(value);
  return ["www.google.com", "maps.google.com", "google.com"].includes(url.hostname)
    && !url.port
    && (url.pathname === "/maps/embed" && Boolean(url.searchParams.get("pb"))
      || /^\/maps\/?$/.test(url.pathname) && url.searchParams.get("output") === "embed" && Boolean(url.searchParams.get("q")));
}

const link = z.string().trim().max(2000).refine(v => !v || isHttpsUrl(v), "Usa un enlace completo que comience con https://");
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Hora inválida");
export const availabilitySchema = z.array(z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: time,
  endTime: time,
  slotMinutes: z.coerce.number().int().min(15).max(240),
  active: z.boolean()
})).max(30).superRefine((items, ctx) => {
  items.forEach((item, index) => {
    if (item.endTime <= item.startTime) ctx.addIssue({ code: "custom", path: [index, "endTime"], message: "La hora final debe ser posterior a la inicial" });
    if (item.active && items.slice(0, index).some(other => other.active && other.dayOfWeek === item.dayOfWeek && other.startTime < item.endTime && other.endTime > item.startTime)) {
      ctx.addIssue({ code: "custom", path: [index, "startTime"], message: "Los horarios activos del mismo día no pueden superponerse" });
    }
  });
});

export const settingsSchema = z.object({
  firmName: z.string().trim().min(2).max(120),
  logoUrl: z.string().trim().max(1000).refine(v => !v || isHttpsUrl(v) || /^\/uploads\/[a-zA-Z0-9._-]+$/.test(v) || /^http:\/\/localhost:\d+\/uploads\/[a-zA-Z0-9._-]+$/.test(v), "Logo inválido: usa una imagen HTTPS o una carga local"),
  attorneyName: z.string().trim().min(2).max(150),
  professionalTitle: z.string().trim().min(2).max(150),
  tagline: z.string().trim().min(3).max(180),
  biography: z.string().max(10000),
  phone: z.string().trim().max(40),
  whatsappNumber: z.string().trim().max(30).refine(v => !v || /^\d{8,15}$/.test(v.replace(/[\s()+-]/g, "")), "WhatsApp debe incluir el código de país y entre 8 y 15 dígitos"),
  contactEmail: z.union([z.literal(""), z.email()]),
  officeAddress: z.string().trim().max(300),
  mapsUrl: link,
  instagramUrl: link,
  tiktokUrl: link,
  officeHoursNote: z.string().max(300),
  consultationMinutes: z.coerce.number().int().min(15).max(240),
  smtpHost: z.string().max(300),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUser: z.string().max(300),
  smtpPassword: z.string().max(500).optional().default(""),
  smtpFromEmail: z.union([z.literal(""), z.email()]),
  smtpFromName: z.string().max(200),
  notifyAttorney: z.boolean(),
  notifyClient: z.boolean(),
  remindersEnabled: z.boolean(),
  // Optional for compatibility: old clients must not erase the new settings.
  mapEnabled: z.boolean().optional(),
  mapEmbedUrl: z.string().trim().max(8000).refine(v => !v || isMapEmbedUrl(v), "Pega el enlace de Google Maps de Compartir → Insertar un mapa, no un enlace corto ni HTML").optional(),
  mapQuery: z.string().trim().max(300).optional(),
  mapLoadOnClick: z.boolean().optional(),
  officeDirections: z.string().trim().max(1000).optional(),
  contactHeading: z.string().trim().min(3).max(180).optional(),
  contactIntro: z.string().trim().max(1200).optional(),
  whatsappMessage: z.string().trim().max(500).optional(),
  availability: availabilitySchema.optional()
});
