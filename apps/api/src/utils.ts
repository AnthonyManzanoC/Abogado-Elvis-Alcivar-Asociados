import crypto from "node:crypto";

export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

export const makeReference = () => {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replaceAll("-", "");
  return `ALC-${date}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

export const publicSettingsColumns = `
  firm_name, logo_url, attorney_name, professional_title, tagline, biography, phone,
  whatsapp_number, contact_email, office_address, maps_url, instagram_url,
  tiktok_url, timezone, consultation_minutes, office_hours_note,
  map_enabled, map_embed_url, map_query, map_load_on_click, office_directions,
  contact_heading, contact_intro, whatsapp_message
`;
