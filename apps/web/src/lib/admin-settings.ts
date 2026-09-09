export type AdminSettings = Record<string, string | number | boolean | undefined>;
export type Availability = { id?: string; day_of_week: number; start_time: string; end_time: string; slot_minutes: number; active: boolean };

export const settingsFields = [
  "firm_name", "logo_url", "attorney_name", "professional_title", "tagline", "biography",
  "phone", "whatsapp_number", "contact_email", "office_address", "maps_url", "instagram_url", "tiktok_url",
  "office_hours_note", "consultation_minutes", "smtp_host", "smtp_port", "smtp_secure", "smtp_user",
  "smtp_from_email", "smtp_from_name", "notify_attorney", "notify_client", "reminders_enabled",
  "map_enabled", "map_embed_url", "map_query", "map_load_on_click", "office_directions",
  "contact_heading", "contact_intro", "whatsapp_message"
] as const;

export function settingsPayload(settings: AdminSettings, availability: Availability[], smtpPassword: string) {
  const body: Record<string, unknown> = {};
  for (const key of settingsFields) {
    if (settings[key] !== undefined) body[key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())] = settings[key];
  }
  body.smtpPassword = smtpPassword;
  body.availability = availability.map(a => ({ dayOfWeek: a.day_of_week, startTime: a.start_time.slice(0, 5), endTime: a.end_time.slice(0, 5), slotMinutes: Number(a.slot_minutes), active: a.active }));
  return body;
}

export function completeWeek(availability: Availability[]) {
  // Keep every existing interval, including split shifts on the same day.
  const items = [...availability];
  for (let day = 0; day < 7; day++) {
    if (!items.some(item => item.day_of_week === day)) items.push({ day_of_week: day, start_time: "09:00", end_time: "17:00", slot_minutes: 60, active: false });
  }
  return items.sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
}
