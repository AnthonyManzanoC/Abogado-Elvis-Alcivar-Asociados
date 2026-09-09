import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { availabilitySchema, isMapEmbedUrl, settingsSchema } from "../apps/api/src/settings-schema.js";
import { OfficeMap } from "../apps/web/src/components/OfficeMap.js";
import { completeWeek, settingsPayload } from "../apps/web/src/lib/admin-settings.js";
import { contactMap, extractMapSource, mapEmbedUrl, safeExternalUrl, whatsappUrl } from "../apps/web/src/lib/contact.js";
import { fallbackData } from "../apps/web/src/data.js";

const settings = fallbackData.settings;
const body = () => settingsPayload({ ...settings, smtp_host: "", smtp_port: 465, smtp_secure: true, smtp_user: "", smtp_from_email: "", smtp_from_name: "Alcívar Legal", notify_attorney: true, notify_client: true, reminders_enabled: true }, completeWeek([]), "");

test("maps encode the saved address and generate directions without a key", () => {
  const map = contactMap({ ...settings, office_address: "Sucre & 5 de Junio, Babahoyo", map_query: "" });
  assert.equal(new URL(map.embed).searchParams.get("q"), "Sucre & 5 de Junio, Babahoyo");
  assert.equal(new URL(map.embed).searchParams.get("output"), "embed");
  assert.equal(new URL(map.directions).searchParams.get("api"), "1");
  assert.equal(new URL(map.directions).searchParams.get("destination"), "Sucre & 5 de Junio, Babahoyo");
});

test("exact map, custom destination and external link remain independent", () => {
  const exact = "https://www.google.com/maps/embed?pb=!1m18!2m3";
  const map = contactMap({ ...settings, map_embed_url: exact, map_query: "Babahoyo, Ecuador", maps_url: "https://maps.app.goo.gl/example" });
  assert.equal(map.embed, exact);
  assert.equal(map.open, "https://maps.app.goo.gl/example");
  assert.equal(new URL(map.directions).searchParams.get("destination"), "Babahoyo, Ecuador");
});

test("only trusted Google map URLs are embeddable in both API and frontend", () => {
  const valid = ["https://www.google.com/maps/embed?pb=!1m18", "https://maps.google.com/maps?q=Babahoyo&output=embed"];
  const invalid = ["javascript:alert(1)", "data:text/html,hi", "https://evil.test/maps/embed?pb=x", "https://www.google.com.evil.test/maps/embed?pb=x", "https://www.google.com@evil.test/maps/embed?pb=x", "https://user@www.google.com/maps/embed?pb=x", "https://www.google.com:444/maps/embed?pb=x", "https://maps.app.goo.gl/example", "https://www.google.com/maps/embed", "https://www.google.com/maps/preview?pb=x", "http://www.google.com/maps/embed?pb=x"];
  for (const url of valid) { assert.ok(isMapEmbedUrl(url)); assert.ok(mapEmbedUrl(url)); }
  for (const url of invalid) { assert.equal(isMapEmbedUrl(url), false, url); assert.equal(mapEmbedUrl(url), "", url); }
});

test("pasted iframe HTML is reduced to a trusted URL, never rendered as HTML", () => {
  const exact = "https://www.google.com/maps/embed?pb=test&hl=es";
  assert.equal(extractMapSource(`<iframe src="${exact.replace("&", "&amp;")}" width="600" onload="alert(1)"></iframe>`), exact);
  assert.equal(mapEmbedUrl(extractMapSource('<iframe src="https://evil.test" />')), "");
});

test("empty destinations and unsafe links have no broken external actions", () => {
  assert.deepEqual(contactMap({ office_address: "", map_query: "", maps_url: "javascript:alert(1)", map_embed_url: "" }), { query: "", embed: "", open: "", directions: "" });
  assert.equal(safeExternalUrl("javascript:alert(1)"), "");
  assert.equal(safeExternalUrl("https://user:secret@example.test/"), "");
});

test("WhatsApp uses the configured message and validates the destination", () => {
  const url = whatsappUrl("+593 (99) 123-4567", "Hola, ¿puedo agendar? & Gracias");
  assert.equal(new URL(url).pathname, "/593991234567");
  assert.equal(new URL(url).searchParams.get("text"), "Hola, ¿puedo agendar? & Gracias");
  assert.equal(whatsappUrl(""), "");
  assert.equal(whatsappUrl("123evil456"), "");
});

test("a valid admin payload preserves the new contact settings and hides stored secrets", () => {
  const payload = body();
  assert.ok(settingsSchema.safeParse(payload).success);
  assert.equal(payload.mapEnabled, true);
  assert.equal(payload.contactHeading, settings.contact_heading);
  const safe = settingsPayload({ ...settings, smtp_password_encrypted: "never-send", smtpPasswordConfigured: true }, [], "");
  assert.ok(!Object.hasOwn(safe, "smtpPasswordEncrypted"));
  assert.ok(!Object.hasOwn(safe, "smtpPasswordConfigured"));
});

test("old clients can save without resetting new map and contact fields", () => {
  const payload = body();
  for (const key of ["mapEnabled", "mapEmbedUrl", "mapQuery", "mapLoadOnClick", "officeDirections", "contactHeading", "contactIntro", "whatsappMessage", "availability"]) delete payload[key];
  const parsed = settingsSchema.parse(payload);
  assert.equal(parsed.mapEnabled, undefined);
  assert.equal(parsed.mapEmbedUrl, undefined);
});

test("invalid maps and unsafe public links are rejected before persistence", () => {
  assert.equal(settingsSchema.safeParse({ ...body(), mapEmbedUrl: "https://evil.test/embed" }).success, false);
  assert.equal(settingsSchema.safeParse({ ...body(), mapsUrl: "javascript:alert(1)" }).success, false);
  assert.equal(settingsSchema.safeParse({ ...body(), mapEnabled: "false" }).success, false);
});

test("time validation rejects invalid ranges and overlaps but preserves split shifts", () => {
  const morning = { dayOfWeek: 1, startTime: "09:00", endTime: "12:00", slotMinutes: 60, active: true };
  assert.ok(availabilitySchema.safeParse([morning, { ...morning, startTime: "13:00", endTime: "17:00" }]).success);
  assert.equal(availabilitySchema.safeParse([{ ...morning, endTime: "08:00" }]).success, false);
  assert.equal(availabilitySchema.safeParse([{ ...morning, startTime: "25:99" }]).success, false);
  assert.equal(availabilitySchema.safeParse([morning, { ...morning, startTime: "11:00", endTime: "13:00" }]).success, false);
  const shifts = completeWeek([{ day_of_week: 1, start_time: "09:00:00", end_time: "12:00:00", slot_minutes: 30, active: true }, { day_of_week: 1, start_time: "13:00:00", end_time: "17:00:00", slot_minutes: 60, active: true }]);
  assert.equal(shifts.length, 8);
  assert.equal(shifts.filter(row => row.day_of_week === 1).length, 2);
});

test("map privacy mode avoids third-party iframe until click and hidden mode renders nothing", () => {
  const consent = renderToStaticMarkup(createElement(OfficeMap, { settings }));
  assert.ok(consent.includes("Ver mapa interactivo"));
  assert.ok(!consent.includes("<iframe"));
  assert.equal(renderToStaticMarkup(createElement(OfficeMap, { settings: { ...settings, map_enabled: false } })), "");
});

test("automatic mode renders a labeled lazy iframe and keeps directions available", () => {
  const markup = renderToStaticMarkup(createElement(OfficeMap, { settings: { ...settings, map_load_on_click: false } }));
  assert.ok(markup.includes("<iframe"));
  assert.ok(markup.includes('loading="lazy"'));
  assert.ok(markup.includes('title="Mapa de'));
  assert.ok(markup.includes("Cómo llegar"));
  assert.ok(markup.includes("Abrir en Google Maps"));
});
